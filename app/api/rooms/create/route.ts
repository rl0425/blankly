import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";
import { generateProblemsV2, type GenerationMetadata } from "@/shared/lib/ai/generateProblems";
import {
  generateCacheKey,
  getCachedProblems,
  setCachedProblems,
  type AIProblem,
} from "@/shared/lib/cache/problem-cache";
import { validateUserInput, InputSecurityError } from "@/shared/lib/validation/input-security";
import { costTracker } from "@/shared/lib/monitoring/cost-tracker";
import type { ProjectCategory } from "@/shared/types";

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
      complexity = "simple", // 'simple' | 'advanced'
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

    // 입력 보안 검증
    try {
      if (sourceData) validateUserInput(sourceData);
      if (aiPrompt) validateUserInput(aiPrompt);
    } catch (error) {
      if (error instanceof InputSecurityError) {
        console.warn(`Security validation failed: ${error.type}`, error.message);
        return NextResponse.json(
          { error: "입력 내용에 보안 문제가 감지되었습니다. 다시 시도해주세요." },
          { status: 400 }
        );
      }
      throw error;
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
    const cacheKey = await generateCacheKey({
      sourceData,
      aiPrompt,
      problemCount,
      difficulty,
      fillBlankRatio,
      subjectiveType,
      gradingStrictness,
      generationMode,
      complexity: generationMode === "ai_only" ? complexity : undefined, // ai_only 모드일 때만 complexity 사용
    });

    let problems: AIProblem[] | null = await getCachedProblems(cacheKey);

    // 캐시 미스 시 AI 호출
    let metadata: GenerationMetadata | null = null;
    if (!problems) {
      // 5. GPT-4o V2 파이프라인으로 문제 생성
      const finalComplexity =
        generationMode === "ai_only" ? complexity : "simple";

      console.log(`\n🎯 문제 생성 시작 [${project.category}/${generationMode}/${finalComplexity}]`);

      try {
        const result = await generateProblemsV2({
          category: project.category as ProjectCategory,
          sourceData: generationMode !== "ai_only" ? sourceData : undefined,
          aiPrompt: generationMode === "ai_only" ? aiPrompt : undefined,
          problemCount,
          difficulty: difficulty as "easy" | "medium" | "hard",
          fillBlankRatio,
          generationMode: generationMode as "user_data" | "hybrid" | "ai_only",
          complexity: finalComplexity as "simple" | "advanced",
        });

        problems = result.problems as AIProblem[];
        metadata = result.metadata;

        // 비용 추적 (DB 저장)
        if (metadata?.usage) {
          const { totalInputTokens, totalOutputTokens, totalCost } = metadata.usage;
          console.log(`\n💰 문제 생성 완료`);
          console.log(`   📊 토큰: ${totalInputTokens.toLocaleString()} input + ${totalOutputTokens.toLocaleString()} output = ${(totalInputTokens + totalOutputTokens).toLocaleString()} total`);
          console.log(`   💵 비용: $${totalCost.toFixed(4)} (약 ${Math.round(totalCost * 1400)}원)\n`);
          
          try {
            await costTracker.trackGeneration({
              userId: user.id,
              stage: `${metadata.pipelineType}_pipeline`,
              inputTokens: totalInputTokens,
              outputTokens: totalOutputTokens,
              model: 'gpt-4o-mini',
            });
          } catch (trackError) {
            console.error('Failed to track cost:', trackError);
          }
        }

        if (problems.length === 0) {
          throw new Error("AI가 문제를 생성하지 못했습니다");
        }

        if (problems.length < problemCount * 0.8) {
          console.warn(`경고: 요청한 문제 수보다 현저히 적게 생성됨`);
        }

        // 캐시 저장 (로그 제거 - 불필요)
        await setCachedProblems(cacheKey, problems);
      } catch (aiError: unknown) {
        console.error("❌ GPT-4o generation failed:", aiError);
        
        if (aiError instanceof Error && aiError.message?.includes('rate limit')) {
          return NextResponse.json(
            { error: 'OpenAI API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' },
            { status: 429 }
          );
        }
        
        throw aiError;
      }
    } else {
      console.log("📦 캐시에서 문제 로드 (비용 없음)");
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
        complexity: generationMode === "ai_only" ? complexity : null, // ai_only 모드일 때만 저장
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
      (problem: AIProblem, index: number) => {
        // question_type 필드 처리: GeneratedProblem은 question_type, 이전 형식은 type 사용
        const questionType = problem.question_type || problem.type;
        
        if (!questionType) {
          console.error('⚠️ Missing question_type in problem:', problem);
          throw new Error(`문제 타입이 없습니다. 문제: ${problem.question?.substring(0, 50)}...`);
        }
        
        return {
          room_id: room.id,
          question: problem.question,
          question_type: questionType,
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
        };
      }
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

    console.log(`✅ 방 생성 완료: ${room.title} (${problems.length}문제)\n`);

    return NextResponse.json({ 
      data: room,
      metadata: metadata || undefined, // V2 메타데이터 포함
    });
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
// V2 System Notes
// ========================================
// GPT-4o 기반 3단계 파이프라인:
// 1. 개념 추출 (user_data/hybrid)
// 2. 문제 설계
// 3. 최종 생성 (도메인별 특화)
// 4. Self-critique 검증
// 5. 품질 필터링
//
// 채점은 여전히 Groq (Llama 3.3) 사용 (실시간 응답 필요)
