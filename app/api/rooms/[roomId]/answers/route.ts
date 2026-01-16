import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";
import type { AIGradeResponse } from "@/shared/types";

// 완료한 방의 답안과 결과를 불러오기
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    // 각 문제별로 가장 최근 답안만 가져오기
    const { data: userAnswers, error: answersError } = await supabase
      .from("user_answers")
      .select("problem_id, user_answer, is_correct, ai_feedback")
      .eq("user_id", user.id)
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });

    if (answersError) {
      console.error("Get user answers error:", answersError);
      return NextResponse.json(
        { error: "답안 정보를 가져올 수 없습니다" },
        { status: 500 }
      );
    }

    // 문제 ID별로 가장 최근 답안만 선택
    const latestAnswers = new Map<
      string,
      { user_answer: string; is_correct: boolean; ai_feedback: AIGradeResponse | null }
    >();

    if (userAnswers) {
      userAnswers.forEach((answer) => {
        if (!latestAnswers.has(answer.problem_id)) {
          latestAnswers.set(answer.problem_id, {
            user_answer: answer.user_answer,
            is_correct: answer.is_correct,
            ai_feedback: answer.ai_feedback,
          });
        }
      });
    }

    // Map을 객체로 변환
    const answers: Record<
      string,
      { user_answer: string; is_correct: boolean; ai_feedback: AIGradeResponse | null }
    > = {};
    latestAnswers.forEach((value, key) => {
      answers[key] = value;
    });

    return NextResponse.json({ data: answers });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

