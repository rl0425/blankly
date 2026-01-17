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
import type {
  GenerationMode,
  GradingStrictness,
} from "@/shared/lib/prompts/ai-prompts";

interface BatchRoomRequest {
  projectId: string;
  title: string;
  problemCount?: number;
  difficulty?: string;
  generationMode?: string;
  sourceData?: string;
  aiPrompt?: string;
  fillBlankRatio?: number;
  subjectiveType?: string;
  gradingStrictness?: string;
}

/**
 * 배치 처리: 여러 방을 한 번에 생성
 * 같은 학습 자료를 사용하는 방들을 묶어서 AI 호출을 최소화
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rooms }: { rooms: BatchRoomRequest[] } = body;

    if (!Array.isArray(rooms) || rooms.length === 0) {
      return NextResponse.json(
        { error: "방 목록이 필요합니다" },
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

    const results = [];
    const cacheGroups = new Map<string, BatchRoomRequest[]>();

    // 1. 캐시 키별로 그룹화 (같은 학습 자료/프롬프트를 사용하는 방들을 묶음)
    for (const room of rooms) {
      const cacheKey = generateCacheKey({
        sourceData: room.sourceData,
        aiPrompt: room.aiPrompt,
        problemCount: room.problemCount || 10,
        difficulty: room.difficulty || "medium",
        fillBlankRatio: room.fillBlankRatio || 60,
        subjectiveType: room.subjectiveType || "both",
        gradingStrictness: room.gradingStrictness || "normal",
        generationMode: room.generationMode || "user_data",
      });

      if (!cacheGroups.has(cacheKey)) {
        cacheGroups.set(cacheKey, []);
      }
      cacheGroups.get(cacheKey)!.push(room);
    }

    // 2. 각 캐시 그룹별로 처리
    for (const [cacheKey, groupRooms] of cacheGroups.entries()) {
      // 캐시 확인
      let problems: AIProblem[] | null = await getCachedProblems(cacheKey);

      // 캐시 미스 시 AI 호출
      if (!problems) {
        const firstRoom = groupRooms[0];
        const project = await supabase
          .from("projects")
          .select("*")
          .eq("id", firstRoom.projectId)
          .eq("user_id", user.id)
          .single();

        if (project.error || !project.data) {
          for (const room of groupRooms) {
            results.push({
              room,
              error: "프로젝트를 찾을 수 없습니다",
            });
          }
          continue;
        }

        // AI로 문제 생성 (한 번만 호출)
        const generationMode: GenerationMode = (firstRoom.generationMode ||
          "user_data") as GenerationMode;
        const gradingStrictness: GradingStrictness =
          (firstRoom.gradingStrictness || "normal") as GradingStrictness;
        const subjectiveType: "fill_blank" | "essay" | "both" =
          (firstRoom.subjectiveType || "both") as
            | "fill_blank"
            | "essay"
            | "both";

        const systemPrompt = buildSystemPrompt(
          generationMode,
          gradingStrictness,
          firstRoom.aiPrompt || undefined // aiPrompt를 topic으로 전달
        );
        const userPrompt = buildUserPrompt({
          generationMode,
          sourceData: firstRoom.sourceData,
          aiPrompt: firstRoom.aiPrompt,
          problemCount: firstRoom.problemCount || 10,
          difficulty: firstRoom.difficulty || "medium",
          fillBlankRatio: firstRoom.fillBlankRatio || 60,
          subjectiveType,
          project: project.data,
        });

        try {
          const completion = await groq.chat.completions.create({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            model: DEFAULT_MODEL,
            temperature: firstRoom.generationMode === "user_data" ? 0.7 : 0.9,
            max_tokens: 16000,
            response_format: { type: "json_object" },
          });

          const aiResponse = completion.choices[0]?.message?.content;
          if (!aiResponse) {
            throw new Error("AI 응답을 받지 못했습니다");
          }

          const parsedResponse = JSON.parse(aiResponse);
          const generatedProblems = parsedResponse.problems || [];

          if (generatedProblems.length === 0) {
            throw new Error("AI가 문제를 생성하지 못했습니다");
          }

          problems = generatedProblems;

          // 캐시 저장 (problems는 null이 아님)
          if (problems) {
            await setCachedProblems(cacheKey, problems);
          }
        } catch (groqError: unknown) {
          if (
            groqError &&
            typeof groqError === "object" &&
            "status" in groqError &&
            groqError.status === 429
          ) {
            for (const room of groupRooms) {
              results.push({
                room,
                error: "일일 토큰 한도를 초과했습니다",
              });
            }
            continue;
          }
          throw groqError;
        }
      }

      // problems가 null이면 다음 그룹으로
      if (!problems) {
        for (const room of groupRooms) {
          results.push({
            room,
            error: "문제를 생성할 수 없습니다",
          });
        }
        continue;
      }

      // 3. 같은 캐시 그룹의 모든 방에 문제 적용
      for (const room of groupRooms) {
        try {
          // 제목 중복 체크
          const { data: existingRoom } = await supabase
            .from("rooms")
            .select("id")
            .eq("project_id", room.projectId)
            .eq("title", room.title.trim())
            .is("deleted_at", null)
            .maybeSingle();

          if (existingRoom) {
            results.push({
              room,
              error: "같은 프로젝트 내에 이미 같은 제목의 방이 있습니다",
            });
            continue;
          }

          // Day 번호 계산
          const { count } = await supabase
            .from("rooms")
            .select("*", { count: "exact", head: true })
            .eq("project_id", room.projectId)
            .is("deleted_at", null);

          const dayNumber = (count || 0) + 1;

          // 방 생성
          const { data: createdRoom, error: roomError } = await supabase
            .from("rooms")
            .insert({
              project_id: room.projectId,
              title: room.title,
              day_number: dayNumber,
              total_problems: problems.length,
              problem_type: "fill_blank",
              difficulty: room.difficulty || "medium",
              generation_mode: room.generationMode || "user_data",
              grading_strictness: room.gradingStrictness || "normal",
              source_data: room.sourceData || null,
              fill_blank_ratio: room.fillBlankRatio || 60,
              prompt_template: room.aiPrompt || null,
            })
            .select()
            .single();

          if (roomError) {
            results.push({
              room,
              error: `방 생성 실패: ${roomError.message}`,
            });
            continue;
          }

          // 문제 저장
          const problemsToInsert = problems.map((problem, index) => ({
            room_id: createdRoom.id,
            question: problem.question,
            question_type: problem.type,
            options: problem.options ? JSON.stringify(problem.options) : null,
            correct_answer: problem.correct_answer,
            explanation: problem.explanation || "",
            difficulty: problem.difficulty || room.difficulty || "medium",
            order_number: index + 1,
            max_length: problem.max_length || null,
            metadata: JSON.stringify({
              alternatives: problem.alternatives || [],
              source_excerpt: problem.source_excerpt || null,
            }),
          }));

          const { error: problemsError } = await supabase
            .from("problems")
            .insert(problemsToInsert);

          if (problemsError) {
            await supabase.from("rooms").delete().eq("id", createdRoom.id);
            results.push({
              room,
              error: `문제 저장 실패: ${problemsError.message}`,
            });
            continue;
          }

          results.push({
            room,
            data: createdRoom,
          });
        } catch (error) {
          results.push({
            room,
            error:
              error instanceof Error
                ? error.message
                : "방 생성 중 오류가 발생했습니다",
          });
        }
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Batch API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "서버 오류가 발생했습니다",
      },
      { status: 500 }
    );
  }
}
