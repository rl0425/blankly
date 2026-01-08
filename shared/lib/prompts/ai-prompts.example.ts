/**
 * AI 프롬프트 템플릿 (예시)
 *
 * 이 파일을 복사하여 `ai-prompts.ts`로 만들고 실제 프롬프트를 작성하세요.
 *
 * 사용 방법:
 * 1. 이 파일을 복사: cp ai-prompts.example.ts ai-prompts.ts
 * 2. ai-prompts.ts 파일을 열어 실제 프롬프트 작성
 * 3. ai-prompts.ts는 자동으로 Git에서 무시됩니다 (.gitignore)
 */

type GenerationMode = "user_data" | "hybrid" | "ai_only";
type GradingStrictness = "strict" | "normal" | "lenient";

interface Project {
  id: string;
  source_data?: {
    role?: string;
    basePrompt?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function buildSystemPrompt(
  mode: GenerationMode,
  strictness: GradingStrictness
): string {
  // TODO: 시스템 프롬프트 작성
  // - AI의 역할 정의
  // - 모드별 지시사항 (user_data, hybrid, ai_only)
  // - 채점 엄격도별 지시사항 (strict, normal, lenient)

  // 예시이므로 파라미터 미사용 (실제 구현 시 사용됨)
  void mode;
  void strictness;

  return "Your system prompt here";
}

export function buildUserPrompt(params: {
  generationMode: GenerationMode;
  sourceData?: string;
  aiPrompt?: string;
  problemCount: number;
  difficulty: string;
  fillBlankRatio: number;
  project: Project;
  subjectiveType?: "fill_blank" | "essay" | "both";
}): string {
  // TODO: 사용자 프롬프트 작성
  // - 문제 생성 규칙
  // - 언어 제약사항
  // - 출력 형식 (JSON)
  // - 중요 지침

  const { problemCount, difficulty } = params;

  return `
문제 생성 요청:
- 문제 수: ${problemCount}개
- 난이도: ${difficulty}

여기에 상세한 프롬프트를 작성하세요.
`;
}
