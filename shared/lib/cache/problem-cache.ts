import { createClient } from "@/shared/lib/supabase/server";
import { createHash } from "crypto";

/**
 * 샘플 버전 조회
 */
async function getSamplesVersion(): Promise<string> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'samples_version')
      .single();
    
    return data?.value || 'v1.0.0';
  } catch (error) {
    console.error('Failed to get samples version:', error);
    return 'v1.0.0';
  }
}

export interface AIProblem {
  question: string;
  question_type?: string; // GeneratedProblem 형식
  type?: string; // 이전 형식 호환성
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
 * 캐시 키 생성 (학습 자료 + 설정 + 샘플 버전의 해시값)
 */
export async function generateCacheKey(params: CacheKeyParams): Promise<string> {
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

  // 샘플 버전 조회 (RAG 결과 반영)
  const samplesVersion = await getSamplesVersion();

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
    complexity: complexity || "simple",
    samplesVersion,  // ⭐ 샘플 버전 추가
  });

  // SHA-256 해시 생성
  const hash = createHash("sha256").update(cacheData).digest("hex");
  return `problem_cache:v2:${hash}`;  // v2로 업그레이드
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
    
    // 기존 캐시 확인
    const { data: existing } = await supabase
      .from("problem_cache")
      .select("cache_key")
      .eq("cache_key", cacheKey)
      .single();
    
    if (existing) {
      // 이미 있으면 업데이트
      const { error } = await supabase
        .from("problem_cache")
        .update({
          problems: problems,
          created_at: new Date().toISOString(),
        })
        .eq("cache_key", cacheKey);
      
      if (error) {
        console.error("Cache update error:", error);
      }
    } else {
      // 없으면 생성
      const { error } = await supabase
        .from("problem_cache")
        .insert({
          cache_key: cacheKey,
          problems: problems,
          created_at: new Date().toISOString(),
        });
      
      if (error) {
        console.error("Cache insert error:", error);
      }
    }
  } catch (error) {
    console.error("Cache storage error:", error);
  }
}

