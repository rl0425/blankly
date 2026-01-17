import { createClient } from "@/shared/lib/supabase/server";
import { createHash } from "crypto";

export interface AIProblem {
  question: string;
  type: string;
  options?: string[] | null;
  correct_answer: string;
  alternatives?: string[];
  explanation?: string;
  difficulty?: string;
  max_length?: number;
  source_excerpt?: string;
}

interface CacheKeyParams {
  sourceData?: string;
  aiPrompt?: string;
  problemCount: number;
  difficulty: string;
  fillBlankRatio: number;
  subjectiveType: string;
  gradingStrictness: string;
  generationMode: string;
  complexity?: string; // "simple" | "advanced"
}

/**
 * 캐시 키 생성 (학습 자료 + 설정의 해시값)
 */
export function generateCacheKey(params: CacheKeyParams): string {
  const {
    sourceData,
    aiPrompt,
    problemCount,
    difficulty,
    fillBlankRatio,
    subjectiveType,
    gradingStrictness,
    generationMode,
    complexity,
  } = params;

  // 캐시 키에 포함할 데이터
  const cacheData = JSON.stringify({
    sourceData: sourceData?.trim() || "",
    aiPrompt: aiPrompt?.trim() || "",
    problemCount,
    difficulty,
    fillBlankRatio,
    subjectiveType,
    gradingStrictness,
    generationMode,
    complexity: complexity || "simple", // 기본값: simple
  });

  // SHA-256 해시 생성
  const hash = createHash("sha256").update(cacheData).digest("hex");
  return `problem_cache:${hash}`;
}

/**
 * 캐시된 문제 조회
 */
export async function getCachedProblems(
  cacheKey: string
): Promise<AIProblem[] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("problem_cache")
      .select("problems, created_at")
      .eq("cache_key", cacheKey)
      .single();

    if (error || !data) {
      return null;
    }

    // 캐시 만료 시간: 7일
    const cacheAge = Date.now() - new Date(data.created_at).getTime();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7일

    if (cacheAge > maxAge) {
      // 만료된 캐시 삭제
      await supabase.from("problem_cache").delete().eq("cache_key", cacheKey);
      return null;
    }

    return data.problems as AIProblem[];
  } catch (error) {
    console.error("Cache retrieval error:", error);
    return null;
  }
}

/**
 * 문제 캐시 저장
 */
export async function setCachedProblems(
  cacheKey: string,
  problems: AIProblem[]
): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("problem_cache").upsert({
      cache_key: cacheKey,
      problems: problems,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Cache storage error:", error);
    }
  } catch (error) {
    console.error("Cache storage error:", error);
  }
}

