"use server";

import { createClient } from "@/shared/lib/supabase/server";
import type { RoomWithProject } from "@/shared/types";

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

  // 방 정보에서 채점 엄격도 및 삭제 여부 가져오기
  const { data: room } = await supabase
    .from("rooms")
    .select("grading_strictness, deleted_at, project_id, projects!inner(deleted_at)")
    .eq("id", roomId)
    .single();

  const gradingStrictness = room?.grading_strictness || "normal";
  
  // 삭제된 방/프로젝트인지 확인
  const isRoomDeleted = room?.deleted_at !== null;
  // projects는 inner join이므로 단일 객체로 반환됨
  const roomWithProject = room as RoomWithProject | null;
  const isProjectDeleted = roomWithProject?.projects?.deleted_at !== null;
  const shouldUpdateStats = !isRoomDeleted && !isProjectDeleted;

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

      // 복수 정답 처리: "/" 구분자가 있으면 분리
      const correctAnswers = problem.correct_answer
        .split("/")
        .map((ans: string) => ans.trim())
        .filter((ans: string) => ans.length > 0);
      
      // 첫 번째 정답을 메인 정답으로 사용 (AI 채점용)
      const mainCorrectAnswer = correctAnswers[0] || problem.correct_answer;
      const hasMultipleAnswers = correctAnswers.length > 1;

      console.log("복수 정답 처리:", {
        original: problem.correct_answer,
        split: correctAnswers,
        hasMultiple: hasMultipleAnswers,
      });

      // 스마트 엄격도 조정: 정답 길이에 따라 자동 조정
      const correctAnswerLength = mainCorrectAnswer.trim().length;
      const wordCount = mainCorrectAnswer.trim().split(/\s+/).length;
      
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

      // 복수 정답을 alternatives에 추가 (AI 채점 시 모든 정답 확인)
      const allAlternatives = hasMultipleAnswers
        ? [...alternatives, ...correctAnswers.slice(1)]
        : alternatives;

      const gradeResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ai/grade`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: problem.question,
            correctAnswer: problem.correct_answer, // 원본 전체 전달 (AI가 "/" 구분 처리)
            userAnswer,
            alternatives: allAlternatives,
            gradingStrictness: smartStrictness, // 스마트 조정된 엄격도
          }),
        }
      );

      if (gradeResponse.ok) {
        const gradeResult = await gradeResponse.json();
        isCorrect = gradeResult.is_correct;
        aiFeedback = gradeResult;
      } else {
        // AI 채점 실패 시 fallback: 복수 정답 모두 확인
        const normalizedUserAnswer = userAnswer.trim().toLowerCase().replace(/\s+/g, '');
        const normalizedCorrectAnswers = correctAnswers.map((ans: string) =>
          ans.trim().toLowerCase().replace(/\s+/g, '')
        );
        const normalizedAlternatives = allAlternatives.map((alt: string) => 
          alt.trim().toLowerCase().replace(/\s+/g, '')
        );
        
        // 복수 정답 중 하나라도 일치하면 정답
        const matchesAnyCorrectAnswer = normalizedCorrectAnswers.some((correctAns: string) =>
          normalizedUserAnswer === correctAns
        );
        
        // 엄격 모드: 정답 또는 alternatives와 정확히 일치하는지만 확인
        if (smartStrictness === "strict") {
          isCorrect = matchesAnyCorrectAnswer ||
                      normalizedAlternatives.includes(normalizedUserAnswer);
          console.log("엄격 모드 fallback:", isCorrect);
        } else {
          // 보통/느슨 모드: 포함 여부도 확인
          const containsAnyCorrectAnswer = normalizedCorrectAnswers.some((correctAns: string) =>
            normalizedUserAnswer.includes(correctAns) || correctAns.includes(normalizedUserAnswer)
          );
          isCorrect = matchesAnyCorrectAnswer ||
                      normalizedAlternatives.includes(normalizedUserAnswer) ||
                      containsAnyCorrectAnswer;
          console.log("일반 모드 fallback:", isCorrect);
        }
      }
    } catch (error) {
      console.error("AI grading error:", error);
      // AI 채점 실패 시 alternatives와 비교 (복수 정답 처리)
      const metadata = problem.metadata as { alternatives?: string[] } | null;
      const alternatives = metadata?.alternatives || [];
      
      // 복수 정답 처리: "/" 구분자가 있으면 분리
      const correctAnswers = problem.correct_answer
        .split("/")
        .map((ans: string) => ans.trim())
        .filter((ans: string) => ans.length > 0);
      
      const normalizedUserAnswer = userAnswer.trim().toLowerCase().replace(/\s+/g, '');
      const normalizedCorrectAnswers = correctAnswers.map((ans: string) =>
        ans.trim().toLowerCase().replace(/\s+/g, '')
      );
      const normalizedAlternatives = alternatives.map((alt: string) => 
        alt.trim().toLowerCase().replace(/\s+/g, '')
      );
      
      // 복수 정답 중 하나라도 일치하면 정답
      const matchesAnyCorrectAnswer = normalizedCorrectAnswers.some((correctAns: string) =>
        normalizedUserAnswer === correctAns
      );
      
      // 엄격 모드 판별 (catch 블록에서도 동일 로직)
      const mainCorrectAnswer = correctAnswers[0] || problem.correct_answer;
      const correctAnswerLength = mainCorrectAnswer.trim().length;
      const wordCount = mainCorrectAnswer.trim().split(/\s+/).length;
      const isStrictMode = correctAnswerLength <= 10 || wordCount <= 2;
      
      if (isStrictMode) {
        isCorrect = matchesAnyCorrectAnswer ||
                    normalizedAlternatives.includes(normalizedUserAnswer);
      } else {
        // 보통/느슨 모드: 포함 여부도 확인
        const containsAnyCorrectAnswer = normalizedCorrectAnswers.some((correctAns: string) =>
          normalizedUserAnswer.includes(correctAns) || correctAns.includes(normalizedUserAnswer)
        );
        isCorrect = matchesAnyCorrectAnswer ||
                    normalizedAlternatives.includes(normalizedUserAnswer) ||
                    containsAnyCorrectAnswer;
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

  // 5. 프로필 통계 업데이트 (삭제되지 않은 방/프로젝트인 경우만)
  if (shouldUpdateStats) {
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
  }

  return { 
    data: answer,
    isCorrect,
    aiFeedback,
  };
}

export async function completeRoomSession(roomId: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "로그인이 필요합니다" };
  }

  // 1. 해당 방의 전체 문제 수 가져오기
  const { data: problems, error: problemsError } = await supabase
    .from("problems")
    .select("id")
    .eq("room_id", roomId);

  if (problemsError) {
    console.error("Get problems error:", problemsError);
    return { error: "문제 정보를 가져올 수 없습니다" };
  }

  const totalProblems = problems?.length || 0;

  // 2. 실제 데이터베이스에서 사용자의 답안 조회 (각 문제당 최신 답안만)
  const { data: userAnswers, error: answersError } = await supabase
    .from("user_answers")
    .select("problem_id, is_correct, created_at")
    .eq("user_id", user.id)
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  if (answersError) {
    console.error("Get user answers error:", answersError);
    return { error: "답안 정보를 가져올 수 없습니다" };
  }

  // 3. 각 문제별로 가장 최근 답안만 사용 (문제 ID별로 그룹화)
  const latestAnswers = new Map<string, boolean>();
  if (userAnswers) {
    // created_at으로 내림차순 정렬된 답안에서 문제 ID별로 첫 번째(최신) 답안만 사용
    userAnswers.forEach((answer) => {
      if (!latestAnswers.has(answer.problem_id)) {
        latestAnswers.set(answer.problem_id, answer.is_correct);
      }
    });
  }

  // 4. 통계 계산
  const solvedCount = latestAnswers.size;
  const correctCount = Array.from(latestAnswers.values()).filter((isCorrect) => isCorrect).length;
  const wrongCount = solvedCount - correctCount;

  // 5. 세션 정보 저장
  const { error } = await supabase.from("room_sessions").insert({
    user_id: user.id,
    room_id: roomId,
    total_problems: totalProblems,
    solved_count: solvedCount,
    correct_count: correctCount,
    wrong_count: wrongCount,
    is_completed: true,
    completed_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Complete session error:", error);
    return { error: "세션 완료 처리에 실패했습니다" };
  }

  // 6. 룸 상태 업데이트
  await supabase
    .from("rooms")
    .update({ status: "completed" })
    .eq("id", roomId);

  // 캐시 무효화는 최소화 (데이터 변경 시에만)
  // revalidatePath를 호출하지 않아서 캐시된 데이터를 먼저 보여주고 백그라운드에서 업데이트
  // revalidatePath(`/study/*`);

  return { success: true };
}

export async function markProblemAsCorrect(
  problemId: string,
  roomId: string
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

    // 4. 방과 프로젝트 삭제 여부 확인
    const { data: room } = await supabase
      .from("rooms")
      .select("deleted_at, project_id, projects!inner(deleted_at)")
      .eq("id", roomId)
      .single();

    const isRoomDeleted = room?.deleted_at !== null;
    // projects는 inner join이므로 단일 객체로 반환됨
    const roomWithProject = room as RoomWithProject | null;
    const isProjectDeleted = roomWithProject?.projects?.deleted_at !== null;
    const shouldUpdateStats = !isRoomDeleted && !isProjectDeleted;

    // 5. 프로필 통계 업데이트 (삭제되지 않은 방/프로젝트인 경우만)
    if (shouldUpdateStats) {
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
    }

    // 캐시 무효화는 최소화 (데이터 변경 시에만)
    // revalidatePath를 호출하지 않아서 캐시된 데이터를 먼저 보여주고 백그라운드에서 업데이트
    // revalidatePath(`/study/*`);

    return { success: true };
  } else {
    return { error: "기존 답안을 찾을 수 없습니다" };
  }
}


