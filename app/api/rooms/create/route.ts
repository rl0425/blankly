import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";
import { groq, DEFAULT_MODEL } from "@/shared/lib/groq";

type GenerationMode = "user_data" | "hybrid" | "ai_only";
type GradingStrictness = "strict" | "normal" | "lenient";

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
      gradingStrictness = "normal",
    } = body;

    if (!projectId || !title) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다" },
        { status: 400 }
      );
    }

    // 모드별 검증
    if ((generationMode === "user_data" || generationMode === "hybrid") && !sourceData) {
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
    const { data: { user } } = await supabase.auth.getUser();

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
      project,
    });

    console.log("=== 문제 생성 시작 ===");
    console.log("생성 모드:", generationMode);
    console.log("문제 수:", problemCount);
    console.log("주관식 비율:", fillBlankRatio + "%");

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
      temperature: generationMode === "user_data" ? 0.5 : 0.7, // 자료 기반은 더 보수적
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

    console.log(`AI가 생성한 문제 수: ${problems.length}개 (요청: ${problemCount}개)`);

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
    const problemsToInsert = problems.map((problem: any, index: number) => ({
      room_id: room.id,
      question: problem.question,
      question_type: problem.type,
      options: problem.options ? JSON.stringify(problem.options) : null,
      correct_answer: problem.correct_answer,
      explanation: problem.explanation || "",
      difficulty: problem.difficulty || difficulty,
      order_number: index + 1,
      metadata: JSON.stringify({
        alternatives: problem.alternatives || [],
        source_excerpt: problem.source_excerpt || null,
      }),
    }));

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
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message || "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// ========================================
// Helper Functions
// ========================================

function buildSystemPrompt(mode: GenerationMode, strictness: GradingStrictness): string {
  const baseSystem = "You are an expert educational content creator specialized in creating effective learning materials.";

  const modeInstructions = {
    user_data: "Your task is to analyze the provided learning material and extract meaningful fill-in-the-blank and multiple-choice questions directly from it. Do NOT create questions about topics not mentioned in the material.",
    hybrid: "Your task is to analyze the provided learning material, create questions from it, AND generate additional related questions to enhance learning.",
    ai_only: "Your task is to create comprehensive learning questions based on the given topic and requirements.",
  };

  const strictnessInstructions = {
    strict: "For fill-in-the-blank questions, provide comprehensive alternatives including ALL synonyms, translations, and common expressions. This is critical for fair grading.",
    normal: "For fill-in-the-blank questions, provide extensive alternatives including translations, synonyms, common variations, and related terms.",
    lenient: "For fill-in-the-blank questions, provide very extensive alternatives including keywords, partial answers, loose variations, and related concepts.",
  };

  return `${baseSystem}

${modeInstructions[mode]}

${strictnessInstructions[strictness]}

Always respond with valid JSON only, following the exact format specified.`;
}

function buildUserPrompt(params: {
  generationMode: GenerationMode;
  sourceData?: string;
  aiPrompt?: string;
  problemCount: number;
  difficulty: string;
  fillBlankRatio: number;
  project: any;
}): string {
  const { generationMode, sourceData, aiPrompt, problemCount, difficulty, fillBlankRatio, project } = params;

  const fillBlankCount = Math.round((problemCount * fillBlankRatio) / 100);
  const multipleChoiceCount = problemCount - fillBlankCount;

  const difficultyText = {
    easy: "쉬움 (기초 수준)",
    medium: "보통 (중급 수준)",
    hard: "어려움 (고급 수준)",
  }[difficulty];

  let content = "";

  // 모드별 콘텐츠
  if (generationMode === "user_data") {
    content = `
# 학습 자료 분석 및 문제 생성

다음 학습 자료를 분석하고, **이 자료에서만** 문제를 추출하세요:

---
${sourceData}
---

**중요 규칙**:
1. 자료에 명시된 내용만 사용
2. 추측하거나 외부 지식 사용 금지
3. 핵심 개념, 용어, 정의를 문제화
4. 문제가 자료의 어느 부분에서 왔는지 source_excerpt에 포함`;
  } else if (generationMode === "hybrid") {
    content = `
# 하이브리드 문제 생성

다음 학습 자료를 기반으로, 자료 속 문제 + 연관 문제를 생성하세요:

---
${sourceData}
---

**문제 구성**:
- ${Math.round(problemCount * 0.6)}개: 자료에서 직접 추출
- ${Math.round(problemCount * 0.4)}개: 자료 주제와 연관된 추가 문제

**연관 문제 예시**:
- 자료 내용의 심화 응용
- 관련 개념의 비교/대조
- 실전 활용 문제`;
  } else {
    // ai_only
    const projectData = project.source_data as any;
    const role = projectData?.role || "";
    const basePrompt = projectData?.basePrompt || "";

    content = `
# AI 전체 생성 모드

${role ? `역할: ${role}\n` : ""}
${basePrompt ? `프로젝트 기본 지시:\n${basePrompt}\n` : ""}

**사용자 요구사항**:
${aiPrompt}

위 내용을 바탕으로 완전한 학습 문제 세트를 생성하세요.`;
  }

  return `${content}

---

# 문제 생성 조건

- **총 문제 수**: 정확히 ${problemCount}개 (필수!)
- **난이도**: ${difficultyText}
- **문제 유형 비율**:
  - 주관식 (fill_blank): ${fillBlankCount}개
  - 객관식 (multiple_choice): ${multipleChoiceCount}개

---

# 출력 형식 (JSON만 반환)

\`\`\`json
{
  "problems": [
    {
      "question": "문제 내용 (빈칸은 _____ 로 표시)",
      "type": "fill_blank" | "multiple_choice",
      "options": ["A", "B", "C", "D"] (객관식만, null if fill_blank),
      "correct_answer": "정답",
      "alternatives": ["대체정답1", "대체정답2", ...] (주관식만, 다양한 표현 포함),
      "explanation": "해설",
      "difficulty": "${difficulty}",
      "source_excerpt": "자료 원문 발췌 (해당되는 경우)"
    }
  ]
}
\`\`\`

---

# 중요 지침

1. **정확히 ${problemCount}개 문제 생성** (더 적거나 많으면 안 됨)
2. **주관식 alternatives**는 매우 중요! 풍부하게 포함:
   - **동의어**: "정의된" → ["선언된", "작성된", "정의된", "defined", "declared"]
   - **한글/영어**: "가상" → ["Virtual", "virtual", "버츄얼", "버추얼"]
   - **대소문자**: "DOM" → ["dom", "Dom"]
   - **축약형**: "JavaScript" → ["JS", "자바스크립트", "Javascript"]
   - **띄어쓰기**: "실행 컨텍스트" → ["실행컨텍스트"]
   - **일반 오타**: "렉시컬" → ["렉시칼", "lexical"]
   
   **중요**: 단어가 짧을수록 alternatives를 많이 포함해야 합니다!
3. **객관식 options**는 정확히 4개, 정답은 options 중 하나
4. **question**은 명확하고 모호하지 않게
5. 모든 필드는 필수 (null 금지, 빈 배열은 허용)

반드시 정확히 ${problemCount}개의 문제를 포함한 JSON을 반환하세요!`;
}
