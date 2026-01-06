"use server";

import { createClient } from "@/shared/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getProblemsByRoom(roomId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("problems")
    .select("*")
    .eq("room_id", roomId)
    .order("order_number", { ascending: true });

  if (error) {
    console.error("Get problems error:", error);
    return [];
  }

  return data || [];
}

export async function submitAnswer(
  problemId: string,
  roomId: string,
  userAnswer: string
) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "로그인이 필요합니다" };
  }

  // 1. 문제 및 방 정보 가져오기
  const { data: problem, error: problemError } = await supabase
    .from("problems")
    .select("*")
    .eq("id", problemId)
    .single();

  if (problemError || !problem) {
    return { error: "문제를 찾을 수 없습니다" };
  }

  // 방 정보에서 채점 엄격도 가져오기
  const { data: room } = await supabase
    .from("rooms")
    .select("grading_strictness")
    .eq("id", roomId)
    .single();

  const gradingStrictness = room?.grading_strictness || "normal";

  // 2. 정답 체크
  let isCorrect = false;
  let aiFeedback = null;

  console.log("=== 채점 시작 ===");
  console.log("문제 유형:", problem.question_type);
  console.log("사용자 답변:", userAnswer);
  console.log("정답:", problem.correct_answer);
  console.log("옵션:", problem.options);

  if (problem.question_type === "multiple_choice") {
    // 단일 선택 객관식
    const normalizedUserAnswer = userAnswer.trim();
    const normalizedCorrectAnswer = problem.correct_answer.trim();
    
    // Case 1: 정답이 "A", "B" 형식 (인덱스)
    if (/^[A-Z]$/.test(normalizedCorrectAnswer)) {
      // 옵션 배열에서 해당 인덱스의 값 가져오기
      const correctIndex = normalizedCorrectAnswer.charCodeAt(0) - 65; // A=0, B=1, ...
      const options = typeof problem.options === 'string' 
        ? JSON.parse(problem.options) 
        : problem.options;
      
      if (options && options[correctIndex]) {
        const correctOptionText = options[correctIndex];
        // 사용자 답변과 옵션 텍스트 비교
        isCorrect = normalizedUserAnswer === correctOptionText;
        
        console.log("객관식 비교 (인덱스 형식):");
        console.log("- 정답 인덱스:", normalizedCorrectAnswer);
        console.log("- 정답 텍스트:", correctOptionText);
        console.log("- 사용자 답변:", normalizedUserAnswer);
        console.log("- 결과:", isCorrect);
      }
    } else {
      // Case 2: 정답이 옵션 전체 텍스트
      isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;
      
      console.log("객관식 비교 (텍스트 형식):");
      console.log("- 사용자 (trim):", normalizedUserAnswer);
      console.log("- 정답 (trim):", normalizedCorrectAnswer);
      console.log("- 결과:", isCorrect);
    }
  } else if (problem.question_type === "multiple_select") {
    // 복수 선택 객관식: 모든 정답이 선택되었는지 확인
    const userAnswers = userAnswer.split("|||").map((a: string) => a.trim()).sort();
    const correctAnswers = problem.correct_answer.split("|||").map((a: string) => a.trim()).sort();
    isCorrect = JSON.stringify(userAnswers) === JSON.stringify(correctAnswers);
  } else {
    // 주관식: AI로 유사도 판단
    try {
      // metadata에서 alternatives 추출
      const metadata = problem.metadata as { alternatives?: string[] } | null;
      const alternatives = metadata?.alternatives || [];

      // 스마트 엄격도 조정: 정답 길이에 따라 자동 조정
      const correctAnswerLength = problem.correct_answer.trim().length;
      const wordCount = problem.correct_answer.trim().split(/\s+/).length;
      
      let smartStrictness = gradingStrictness;
      
      // 용어/단어 문제 (10글자 이하 또는 단어 2개 이하) → 엄격 모드 강제
      if (correctAnswerLength <= 10 || wordCount <= 2) {
        smartStrictness = "strict";
        console.log("🔒 용어/단어 문제 감지 → 엄격 모드 적용");
      } 
      // 짧은 구절 (30글자 이하)
      else if (correctAnswerLength <= 30) {
        smartStrictness = gradingStrictness; // 사용자 설정 유지
        console.log("📝 짧은 구절 → 사용자 설정 유지:", smartStrictness);
      }
      // 서술형 (30글자 이상) → 최소 보통 이상
      else {
        smartStrictness = gradingStrictness === "strict" ? "normal" : gradingStrictness;
        console.log("📄 서술형 문제 → 보통 이상 적용:", smartStrictness);
      }

      const gradeResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ai/grade`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: problem.question,
            correctAnswer: problem.correct_answer,
            userAnswer,
            alternatives,
            gradingStrictness: smartStrictness, // 스마트 조정된 엄격도
          }),
        }
      );

      if (gradeResponse.ok) {
        const gradeResult = await gradeResponse.json();
        isCorrect = gradeResult.is_correct;
        aiFeedback = gradeResult;
      } else {
        // AI 채점 실패 시 alternatives와 비교
        const normalizedUserAnswer = userAnswer.trim().toLowerCase().replace(/\s+/g, '');
        const normalizedCorrectAnswer = problem.correct_answer.trim().toLowerCase().replace(/\s+/g, '');
        const normalizedAlternatives = alternatives.map((alt: string) => 
          alt.trim().toLowerCase().replace(/\s+/g, '')
        );
        
        // 엄격 모드: 정답 또는 alternatives와 정확히 일치하는지만 확인
        if (smartStrictness === "strict") {
          isCorrect = normalizedUserAnswer === normalizedCorrectAnswer ||
                      normalizedAlternatives.includes(normalizedUserAnswer);
          console.log("엄격 모드 fallback:", isCorrect);
        } else {
          // 보통/느슨 모드: 포함 여부도 확인
          isCorrect = normalizedUserAnswer === normalizedCorrectAnswer ||
                      normalizedAlternatives.includes(normalizedUserAnswer) ||
                      normalizedCorrectAnswer.includes(normalizedUserAnswer);
          console.log("일반 모드 fallback:", isCorrect);
        }
      }
    } catch (error) {
      console.error("AI grading error:", error);
      // AI 채점 실패 시 alternatives와 비교
      const metadata = problem.metadata as { alternatives?: string[] } | null;
      const alternatives = metadata?.alternatives || [];
      const normalizedUserAnswer = userAnswer.trim().toLowerCase().replace(/\s+/g, '');
      const normalizedCorrectAnswer = problem.correct_answer.trim().toLowerCase().replace(/\s+/g, '');
      const normalizedAlternatives = alternatives.map((alt: string) => 
        alt.trim().toLowerCase().replace(/\s+/g, '')
      );
      
      // 엄격 모드 판별 (catch 블록에서도 동일 로직)
      const correctAnswerLength = problem.correct_answer.trim().length;
      const wordCount = problem.correct_answer.trim().split(/\s+/).length;
      const isStrictMode = correctAnswerLength <= 10 || wordCount <= 2;
      
      if (isStrictMode) {
        isCorrect = normalizedUserAnswer === normalizedCorrectAnswer ||
                    normalizedAlternatives.includes(normalizedUserAnswer);
      } else {
        isCorrect = normalizedUserAnswer === normalizedCorrectAnswer ||
                    normalizedAlternatives.includes(normalizedUserAnswer) ||
                    normalizedCorrectAnswer.includes(normalizedUserAnswer);
      }
    }
  }

  // 3. 답안 저장 (AI 피드백 포함)
  const { data: answer, error: answerError } = await supabase
    .from("user_answers")
    .insert({
      user_id: user.id,
      problem_id: problemId,
      room_id: roomId,
      user_answer: userAnswer,
      is_correct: isCorrect,
      ai_feedback: aiFeedback,
    })
    .select()
    .single();

  if (answerError) {
    console.error("Submit answer error:", answerError);
    return { error: "답안 제출에 실패했습니다" };
  }

  // 4. 틀린 문제면 wrong_problems에 추가
  if (!isCorrect) {
    await supabase.from("wrong_problems").insert({
      user_id: user.id,
      problem_id: problemId,
      user_answer_id: answer.id,
    });
  }

  // 5. 프로필 통계 업데이트
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("total_solved, total_correct")
    .eq("user_id", user.id)
    .single();

  if (profile) {
    await supabase
      .from("user_profiles")
      .update({
        total_solved: profile.total_solved + 1,
        total_correct: isCorrect ? profile.total_correct + 1 : profile.total_correct,
      })
      .eq("user_id", user.id);
  }

  revalidatePath(`/study/*`);

  return { 
    data: answer,
    isCorrect,
    aiFeedback,
  };
}

export async function completeRoomSession(
  roomId: string,
  stats: {
    totalProblems: number;
    solvedCount: number;
    correctCount: number;
    wrongCount: number;
  }
) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "로그인이 필요합니다" };
  }

  // 세션 정보 저장
  const { error } = await supabase.from("room_sessions").insert({
    user_id: user.id,
    room_id: roomId,
    total_problems: stats.totalProblems,
    solved_count: stats.solvedCount,
    correct_count: stats.correctCount,
    wrong_count: stats.wrongCount,
    is_completed: true,
    completed_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Complete session error:", error);
    return { error: "세션 완료 처리에 실패했습니다" };
  }

  // 룸 상태 업데이트
  await supabase
    .from("rooms")
    .update({ status: "completed" })
    .eq("id", roomId);

  revalidatePath(`/study/*`);

  return { success: true };
}

export async function markProblemAsCorrect(
  problemId: string,
  roomId: string,
  userAnswer: string
) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "로그인이 필요합니다" };
  }

  // 1. 기존 답안 찾기 (가장 최근 것)
  const { data: existingAnswer } = await supabase
    .from("user_answers")
    .select("*")
    .eq("user_id", user.id)
    .eq("problem_id", problemId)
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingAnswer) {
    // 2. 기존 답안을 정답으로 업데이트
    const { error: updateError } = await supabase
      .from("user_answers")
      .update({
        is_correct: true,
        manually_corrected: true,
      })
      .eq("id", existingAnswer.id);

    if (updateError) {
      return { error: "답안 업데이트 실패" };
    }

    // 3. wrong_problems에서 제거
    await supabase
      .from("wrong_problems")
      .delete()
      .eq("user_answer_id", existingAnswer.id);

    // 4. 프로필 통계 업데이트 (정답 수 +1)
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("total_correct")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      await supabase
        .from("user_profiles")
        .update({
          total_correct: profile.total_correct + 1,
        })
        .eq("user_id", user.id);
    }

    revalidatePath(`/study/*`);

    return { success: true };
  } else {
    return { error: "기존 답안을 찾을 수 없습니다" };
  }
}


