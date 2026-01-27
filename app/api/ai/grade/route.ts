import { NextRequest, NextResponse } from "next/server";
import { groq, DEFAULT_MODEL } from "@/shared/lib/groq";
import { getGradeAnswerPrompt } from "@/shared/lib/groq/prompts";
import { z } from "zod";

const RequestSchema = z.object({
  question: z.string().min(1),
  correctAnswer: z.string().min(1),
  userAnswer: z.string().min(1).refine(
    (val) => {
      const trimmed = val.trim();
      // 의미 없는 답변 거부: 단일 특수문자, "모름", "?", "-" 등
      const meaninglessPatterns = /^[?!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/~`]+$|^(모름|모르겠음|몰라|모르겠어요)$/i;
      return !meaninglessPatterns.test(trimmed);
    },
    { message: "의미 있는 답변을 입력해주세요" }
  ),
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

    // 비용 추적 로그 (Groq는 무료/매우 저렴)
    if (completion.usage) {
      const { prompt_tokens, completion_tokens, total_tokens } = completion.usage;
      console.log(`💰 채점 완료 - 토큰: ${total_tokens.toLocaleString()} (input: ${prompt_tokens}, output: ${completion_tokens}) | 비용: ~무료 (Groq)`);
    }

    const parsedResult = JSON.parse(result);

    return NextResponse.json(parsedResult);
  } catch (error) {
    console.error("AI grade error:", error);
    
    if (error instanceof z.ZodError) {
      // 의미 없는 답변 감지 시 자동으로 오답 처리
      const isMeaninglessAnswer = error.issues.some(issue => 
        issue.path.includes('userAnswer') && issue.message.includes('의미 있는 답변')
      );
      
      if (isMeaninglessAnswer) {
        return NextResponse.json({
          is_correct: false,
          score: 0,
          feedback: "의미 있는 답변을 입력해주세요. 특수문자나 '모름' 같은 답변은 인정되지 않습니다.",
          improvement_tip: "문제를 다시 읽고 정답을 생각해보세요."
        });
      }
      
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

