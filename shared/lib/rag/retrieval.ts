/**
 * Hybrid Search 시스템
 * 
 * 전략:
 * 1. Keyword Search (정확한 매칭)
 * 2. Vector Search (의미적 유사도)
 * 3. RRF (Reciprocal Rank Fusion) 결합
 * 4. Hierarchical Fallback (계층적 폴백)
 */

import { createClient } from '@supabase/supabase-js';
import { createEmbedding } from '@/shared/lib/openai/client';
import { findParentCategory, TECH_HIERARCHY } from './hierarchy';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface SearchParams {
  query: string;
  domain?: string;
  limit?: number;
  threshold?: number;
}

/**
 * Hybrid Search: Keyword + Vector
 */
export async function searchSimilarProblems(params: SearchParams) {
  const { query, domain, limit = 5, threshold = 0.7 } = params;
  
  console.log(`🔍 Searching for: "${query}" in domain: ${domain || 'all'}`);
  
  // 1. Keyword 검색 (정확한 매칭)
  const keywordResults = await keywordSearch(query, domain);
  console.log(`  📝 Keyword results: ${keywordResults.length}`);
  
  // 2. Vector 검색 (의미적 유사도)
  const vectorResults = await vectorSearch(query, domain, threshold);
  console.log(`  🧮 Vector results: ${vectorResults.length}`);
  
  // 3. RRF (Reciprocal Rank Fusion) 결합
  let merged = hybridMerge(keywordResults, vectorResults, limit);
  console.log(`  🔗 Merged results: ${merged.length}`);
  
  // 4. 부족하면 계층적 폴백
  if (merged.length < 3 && domain) {
    console.log(`  ⚠️  Insufficient results, trying hierarchical fallback...`);
    const fallback = await hierarchicalFallback(query, domain);
    merged.push(...fallback);
    merged = merged.slice(0, limit);
    console.log(`  ✅ After fallback: ${merged.length}`);
  }
  
  // 5. 사람 샘플 우선 (Model Collapse 방지)
  merged = prioritizeHumanSamples(merged, limit);
  
  return merged.slice(0, limit);
}

/**
 * 사람 샘플 우선 정렬 (3:2 비율)
 */
function prioritizeHumanSamples(samples: any[], limit: number): any[] {
  const humanSamples = samples.filter(s => s.origin === 'human');
  const generatedSamples = samples.filter(s => s.origin !== 'human');
  
  // 3:2 비율 유지
  const humanTarget = Math.ceil(limit * 0.6);  // 60%
  const generatedTarget = Math.floor(limit * 0.4);  // 40%
  
  return [
    ...humanSamples.slice(0, humanTarget),
    ...generatedSamples.slice(0, generatedTarget)
  ].slice(0, limit);
}

/**
 * Keyword 검색
 */
async function keywordSearch(query: string, domain?: string) {
  const keywords = query.toLowerCase().split(/\s+/);
  
  let queryBuilder = supabase
    .from('problem_samples')
    .select('*');
  
  if (domain) {
    queryBuilder = queryBuilder.eq('domain', domain);
  }
  
  // keywords 배열에 query가 포함되어 있는지 확인
  queryBuilder = queryBuilder.or(
    keywords.map(kw => `keywords.cs.{${kw}}`).join(',')
  );
  
  const { data } = await queryBuilder.limit(10);
  
  return data || [];
}

/**
 * Vector 검색
 */
async function vectorSearch(query: string, domain?: string, threshold: number) {
  try {
    const embedding = await createEmbedding(query);
    
    const { data } = await supabase.rpc('match_problem_samples', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: 10,
      filter_domain: domain || null,
    });
    
    return data || [];
  } catch (error) {
    console.error('Vector search failed:', error);
    return [];
  }
}

/**
 * RRF (Reciprocal Rank Fusion) 결합
 */
function hybridMerge(keywords: any[], vectors: any[], limit: number) {
  const scoreMap = new Map();
  
  // Keyword 점수 (가중치 2배)
  keywords.forEach((item, idx) => {
    const rrf = 1 / (idx + 60);
    scoreMap.set(item.id, (scoreMap.get(item.id) || 0) + rrf * 2);
  });
  
  // Vector 점수
  vectors.forEach((item, idx) => {
    const rrf = 1 / (idx + 60);
    scoreMap.set(item.id, (scoreMap.get(item.id) || 0) + rrf);
  });
  
  // 점수 순 정렬
  return [...scoreMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => {
      const item = keywords.find(k => k.id === id) || vectors.find(v => v.id === id);
      return item;
    })
    .filter(Boolean)
    .slice(0, limit);
}

/**
 * 계층적 폴백
 * 예: "Next.js" → "TypeScript" → "프론트엔드" → "코딩"
 */
async function hierarchicalFallback(query: string, domain: string) {
  const results = [];
  
  // 1. 상위 카테고리 검색
  const parentCategory = findParentCategory(query, domain);
  if (parentCategory) {
    const { data } = await supabase
      .from('problem_samples')
      .select('*')
      .eq('domain', domain)
      .eq('subdomain', parentCategory)
      .limit(2);
    
    if (data) results.push(...data);
  }
  
  // 2. 도메인 일반 샘플
  if (results.length < 2) {
    const { data } = await supabase
      .from('problem_samples')
      .select('*')
      .eq('domain', domain)
      .is('subdomain', null)
      .limit(2);
    
    if (data) results.push(...data);
  }
  
  return results;
}

/**
 * 예시를 프롬프트 형식으로 변환
 */
export function formatExamplesForPrompt(examples: any[]): string {
  if (examples.length === 0) {
    return 'No similar examples found. Generate based on general domain knowledge.';
  }
  
  return examples
    .map((ex, idx) => {
      const similarity = ex.similarity 
        ? `(Similarity: ${(ex.similarity * 100).toFixed(1)}%)`
        : '';
      
      return `
Example ${idx + 1} ${similarity}:
${JSON.stringify(ex.problem, null, 2)}
      `.trim();
    })
    .join('\n\n---\n\n');
}

