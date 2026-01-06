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

  // 1. 문제 정보 가져오기
  const { data: problem, error: problemError } = await supabase
    .from("problems")
    .select("*")
    .eq("id", problemId)
    .single();

  if (problemError || !problem) {
    return { error: "문제를 찾을 수 없습니다" };
  }

  // 2. 정답 체크 (간단한 비교, 나중에 AI로 교체 가능)
  const isCorrect = userAnswer.trim().toLowerCase() === problem.correct_answer.trim().toLowerCase();

  // 3. 답안 저장
  const { data: answer, error: answerError } = await supabase
    .from("user_answers")
    .insert({
      user_id: user.id,
      problem_id: problemId,
      room_id: roomId,
      user_answer: userAnswer,
      is_correct: isCorrect,
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

