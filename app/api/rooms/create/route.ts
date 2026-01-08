import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";
import { groq, DEFAULT_MODEL } from "@/shared/lib/groq";
import {
  buildSystemPrompt,
  buildUserPrompt,
} from "@/shared/lib/prompts/ai-prompts";

interface AIProblem {
  question: string;
  type: string;
  options?: string[];
  correct_answer: string;
  alternatives?: string[];
  explanation?: string;
  difficulty?: string;
  max_length?: number;
  source_excerpt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      title,
      problemCount = 10,
      difficulty = "medium",
      generationMode = "user_data",
      sourceData, // 사용자 학습 자료
      aiPrompt, // AI 전용 프롬프트
      fillBlankRatio = 60,
      subjectiveType = "both", // 'fill_blank' | 'essay' | 'both'
      gradingStrictness = "normal",
    } = body;

    if (!projectId || !title) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다" },
        { status: 400 }
      );
    }

    // 모드별 검증
    if (
      (generationMode === "user_data" || generationMode === "hybrid") &&
      !sourceData
    ) {
      return NextResponse.json(
        { error: "학습 자료를 입력해주세요" },
        { status: 400 }
      );
    }

    if (generationMode === "ai_only" && !aiPrompt) {
      return NextResponse.json(
        { error: "AI 프롬프트를 입력해주세요" },
        { status: 400 }
      );
    }

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

    // 1. 프로젝트 정보 가져오기
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 2. Day 번호 계산
    const { count } = await supabase
      .from("rooms")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId);

    const dayNumber = (count || 0) + 1;

    // 3. 생성 모드별 프롬프트 생성
    const systemPrompt = buildSystemPrompt(generationMode, gradingStrictness);
    const userPrompt = buildUserPrompt({
      generationMode,
      sourceData,
      aiPrompt,
      problemCount,
      difficulty,
      fillBlankRatio,
      subjectiveType,
      project,
    });

    // 4. AI로 문제 생성
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      model: DEFAULT_MODEL,
      temperature: generationMode === "user_data" ? 0.7 : 0.9, // 다양성 증가 (중복 방지)
      max_tokens: 16000,
      response_format: { type: "json_object" },
    });

    console.log("AI 응답 받음, 파싱 시작...");

    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error("AI 응답을 받지 못했습니다");
    }

    const parsedResponse = JSON.parse(aiResponse);
    const problems = parsedResponse.problems || [];

    if (problems.length === 0) {
      throw new Error("AI가 문제를 생성하지 못했습니다");
    }

    if (problems.length < problemCount * 0.8) {
      console.warn(`경고: 요청한 문제 수보다 현저히 적게 생성됨`);
    }

    // 5. 방 생성
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({
        project_id: projectId,
        title,
        day_number: dayNumber,
        total_problems: problems.length,
        problem_type: "fill_blank", // 혼합 타입
        difficulty,
        generation_mode: generationMode,
        grading_strictness: gradingStrictness,
        source_data: sourceData || null,
        fill_blank_ratio: fillBlankRatio,
        prompt_template: aiPrompt || null,
      })
      .select()
      .single();

    if (roomError) {
      console.error("Room creation error:", roomError);
      return NextResponse.json(
        { error: `방 생성 실패: ${roomError.message}` },
        { status: 500 }
      );
    }

    // 6. 문제들을 DB에 저장
    const problemsToInsert = problems.map(
      (problem: AIProblem, index: number) => ({
        room_id: room.id,
        question: problem.question,
        question_type: problem.type,
        options: problem.options ? JSON.stringify(problem.options) : null,
        correct_answer: problem.correct_answer,
        explanation: problem.explanation || "",
        difficulty: problem.difficulty || difficulty,
        order_number: index + 1,
        max_length: problem.max_length || null, // 서술형 문제용
        metadata: JSON.stringify({
          alternatives: problem.alternatives || [],
          source_excerpt: problem.source_excerpt || null,
        }),
      })
    );

    const { error: problemsError } = await supabase
      .from("problems")
      .insert(problemsToInsert);

    if (problemsError) {
      console.error("Problems insertion error:", problemsError);
      // 방은 생성됐지만 문제 저장 실패 시 방 삭제
      await supabase.from("rooms").delete().eq("id", room.id);
      return NextResponse.json(
        { error: `문제 저장 실패: ${problemsError.message}` },
        { status: 500 }
      );
    }

    // 7. 프로젝트의 total_rooms 증가
    await supabase
      .from("projects")
      .update({ total_rooms: project.total_rooms + 1 })
      .eq("id", projectId);

    console.log("✅ 방 생성 완료:", room.id);

    return NextResponse.json({ data: room });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "서버 오류가 발생했습니다",
      },
      { status: 500 }
    );
  }
}

// ========================================
// Helper Functions
// ========================================
// Note: buildSystemPrompt와 buildUserPrompt는
// shared/lib/prompts/ai-prompts.ts에서 import
