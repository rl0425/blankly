import { NextRequest, NextResponse } from "next/server";
import { submitAnswer } from "@/features/problem/actions/problems";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { problemId, roomId, userAnswer } = body;

    if (!problemId || !roomId || !userAnswer) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다" },
        { status: 400 }
      );
    }

    const result = await submitAnswer(problemId, roomId, userAnswer);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      isCorrect: result.isCorrect,
      aiFeedback: result.aiFeedback,
    });
  } catch (error) {
    console.error("Submit answer error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

