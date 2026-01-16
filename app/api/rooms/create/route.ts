import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";
import { groq, DEFAULT_MODEL } from "@/shared/lib/groq";
import {
  buildSystemPrompt,
  buildUserPrompt,
} from "@/shared/lib/prompts/ai-prompts";
import {
  generateCacheKey,
  getCachedProblems,
  setCachedProblems,
  type AIProblem,
} from "@/shared/lib/cache/problem-cache";

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

    // 2. 같은 프로젝트 내 제목 중복 체크
    const { data: existingRoom } = await supabase
      .from("rooms")
      .select("id")
      .eq("project_id", projectId)
      .eq("title", title.trim())
      .is("deleted_at", null)
      .maybeSingle();

    if (existingRoom) {
      return NextResponse.json(
        { error: "같은 프로젝트 내에 이미 같은 제목의 방이 있습니다" },
        { status: 400 }
      );
    }

    // 3. Day 번호 계산
    const { count } = await supabase
      .from("rooms")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .is("deleted_at", null);

    const dayNumber = (count || 0) + 1;

    // 4. 캐시 키 생성 및 캐시 확인
    const cacheKey = generateCacheKey({
      sourceData,
      aiPrompt,
      problemCount,
      difficulty,
      fillBlankRatio,
      subjectiveType,
      gradingStrictness,
      generationMode,
    });

    let problems: AIProblem[] | null = await getCachedProblems(cacheKey);

    // 캐시 미스 시 AI 호출
    if (!problems) {
      // 5. 생성 모드별 프롬프트 생성
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

      // 6. AI로 문제 생성
    let completion;
    try {
      completion = await groq.chat.completions.create({
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
    } catch (groqError: unknown) {
      // Groq API rate limit 에러 처리
      if (
        groqError &&
        typeof groqError === "object" &&
        "status" in groqError &&
        groqError.status === 429
      ) {
        const errorMessage =
          groqError &&
          typeof groqError === "object" &&
          "error" in groqError &&
          typeof groqError.error === "object" &&
          groqError.error !== null &&
          "message" in groqError.error
            ? String(groqError.error.message)
            : "일일 토큰 한도를 초과했습니다. 잠시 후 다시 시도해주세요.";
        return NextResponse.json(
          { error: errorMessage },
          { status: 429 }
        );
      }
      throw groqError;
    }

      console.log("AI 응답 받음, 파싱 시작...");

      const aiResponse = completion.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error("AI 응답을 받지 못했습니다");
      }

      const parsedResponse = JSON.parse(aiResponse);
      const generatedProblems: AIProblem[] = parsedResponse.problems || [];

      if (generatedProblems.length === 0) {
        throw new Error("AI가 문제를 생성하지 못했습니다");
      }

      if (generatedProblems.length < problemCount * 0.8) {
        console.warn(`경고: 요청한 문제 수보다 현저히 적게 생성됨`);
      }

      problems = generatedProblems;

      // 캐시 저장
      await setCachedProblems(cacheKey, problems);
      console.log("✅ 문제 캐시 저장 완료:", cacheKey);
    } else {
      console.log("✅ 캐시에서 문제 로드:", cacheKey);
    }

    // 7. 방 생성
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

    // 8. 문제들을 DB에 저장
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
