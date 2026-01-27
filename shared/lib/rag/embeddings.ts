/**
 * RAG 임베딩 시스템
 * 
 * 기능:
 * - 문제 샘플 저장
 * - 자동 키워드 추출
 * - 임베딩 생성 및 저장
 */

import { createClient } from '@supabase/supabase-js';
import { createEmbedding } from '@/shared/lib/openai/client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ProblemSample {
  domain: string;
  subdomain?: string;
  problem: any;
  quality_score: number;
  keywords?: string[];
  origin?: 'human' | 'generated';
  generation?: number;
  human_verified?: boolean;
}

/**
 * 단일 문제 샘플 저장
 */
export async function storeProblemSample(sample: ProblemSample) {
  const text = JSON.stringify(sample.problem);
  const embedding = await createEmbedding(text);
  
  // 키워드 자동 추출
  const keywords = sample.keywords || extractKeywords(sample);
  
  const { data, error} = await supabase
    .from('problem_samples')
    .insert({
      domain: sample.domain,
      subdomain: sample.subdomain,
      problem: sample.problem,
      embedding,
      quality_score: sample.quality_score,
      keywords,
      origin: sample.origin || 'generated',
      generation: sample.generation || 1,
      human_verified: sample.human_verified || false,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * 대량 샘플 저장
 */
export async function bulkStoreSamples(samples: ProblemSample[]) {
  const results = [];
  
  for (const sample of samples) {
    try {
      const result = await storeProblemSample(sample);
      results.push(result);
      console.log(`✅ Stored sample: ${sample.domain}/${sample.subdomain || 'general'}`);
    } catch (error) {
      console.error(`❌ Failed to store sample:`, error);
    }
  }
  
  return results;
}

/**
 * 키워드 자동 추출
 */
function extractKeywords(sample: ProblemSample): string[] {
  const keywords: string[] = [];
  
  // 도메인/서브도메인
  keywords.push(sample.domain);
  if (sample.subdomain) keywords.push(sample.subdomain);
  
  // 문제 텍스트에서 추출
  const question = sample.problem.question || '';
  
  // 대문자로 시작하는 기술 용어 (예: JavaScript, React, Node.js)
  const techTerms = question.match(/\b[A-Z][a-z]*(?:[A-Z][a-z]*)*(?:\.[a-z]+)?\b/g) || [];
  keywords.push(...techTerms);
  
  // 한글 전문 용어 (예: 실행컨텍스트, 클로저)
  const koreanTerms = question.match(/[가-힣]{3,}/g) || [];
  keywords.push(...koreanTerms.filter(term => term.length >= 3 && term.length <= 10));
  
  // 중복 제거 및 소문자 변환
  return [...new Set(keywords.map(k => k.toLowerCase()))];
}

/**
 * 샘플 검색 (테스트용)
 */
export async function getSamplesByDomain(domain: string, limit: number = 10) {
  const { data, error } = await supabase
    .from('problem_samples')
    .select('*')
    .eq('domain', domain)
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

/**
 * 샘플 개수 확인
 */
export async function countSamples(domain?: string) {
  let query = supabase
    .from('problem_samples')
    .select('*', { count: 'exact', head: true });
  
  if (domain) {
    query = query.eq('domain', domain);
  }
  
  const { count, error } = await query;
  
  if (error) throw error;
  return count || 0;
}

