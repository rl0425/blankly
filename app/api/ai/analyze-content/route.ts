import { NextRequest, NextResponse } from "next/server";
import { groq, DEFAULT_MODEL } from "@/shared/lib/groq";
import { getAnalyzeContentPrompt } from "@/shared/lib/groq/prompts";
import { z } from "zod";

const RequestSchema = z.object({
  content: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  problemType: z.enum(["multiple_choice", "fill_blank", "essay"]).default("fill_blank"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { content, difficulty, problemType } = RequestSchema.parse(body);

    const prompt = getAnalyzeContentPrompt(content, difficulty, problemType);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert educational content analyzer. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: DEFAULT_MODEL,
      temperature: 0.7,
      max_tokens: 4000,
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
    console.error("AI analyze error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "잘못된 요청 형식입니다", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "AI 분석 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

