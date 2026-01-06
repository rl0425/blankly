import { NextRequest, NextResponse } from "next/server";
import { groq, DEFAULT_MODEL } from "@/shared/lib/groq";
import { getGradeAnswerPrompt } from "@/shared/lib/groq/prompts";
import { z } from "zod";

const RequestSchema = z.object({
  question: z.string().min(1),
  correctAnswer: z.string().min(1),
  userAnswer: z.string().min(1),
  alternatives: z.array(z.string()).optional(),
  gradingStrictness: z.enum(["strict", "normal", "lenient"]).optional().default("normal"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { question, correctAnswer, userAnswer, alternatives, gradingStrictness } = RequestSchema.parse(body);

    const prompt = getGradeAnswerPrompt(question, correctAnswer, userAnswer, alternatives, gradingStrictness);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a fair grader. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: DEFAULT_MODEL,
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const result = completion.choices[0]?.message?.content;

    if (!result) {
      return NextResponse.json(
        { error: "AI 응답을 받지 못했습니다" },
        { status: 500 }
      );
    }

    const parsedResult = JSON.parse(result);

    return NextResponse.json(parsedResult);
  } catch (error) {
    console.error("AI grade error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "잘못된 요청 형식입니다", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "AI 채점 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

