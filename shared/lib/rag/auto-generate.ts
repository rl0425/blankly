/**
 * 동적 샘플 생성 시스템
 * 
 * 기능:
 * - 샘플이 부족하면 자동 생성
 * - 검증 통과한 샘플만 저장
 * - 자연스러운 DB 확장
 */

import { generateWithGPT4o } from '@/shared/lib/openai/client';
import { getDomainPromptFunction, BASE_SYSTEM_PROMPT } from '@/shared/lib/prompts';
import { storeProblemSample } from './embeddings';
import { searchSimilarProblems } from './retrieval';
import type { ProjectCategory } from '@/shared/types';

/**
 * 샘플 확보 또는 자동 생성
 */
export async function getOrCreateSamples(
  tech: string,
  domain: ProjectCategory,
  minSamples: number = 3
) {
  console.log(`🔍 Getting samples for: ${tech} (domain: ${domain})`);
  
  // 1. 기존 샘플 검색
  let samples = await searchSimilarProblems({
    query: tech,
    domain,
    limit: 5,
  });
  
  console.log(`  📊 Found ${samples.length} existing samples`);
  
  // 2. 샘플이 부족하면 자동 생성
  if (samples.length < minSamples) {
    console.log(`  ⚠️  Insufficient samples (${samples.length}/${minSamples}), auto-generating...`);
    
    const needed = minSamples - samples.length;
    const newSamples = await generateHighQualitySamples({
      tech,
      domain,
      count: needed,
    });
    
    // 3. 검증 통과한 샘플만 저장
    const validated = newSamples.filter(
      (s: { self_critique?: { quality_score?: number } }) => s.self_critique?.quality_score && s.self_critique.quality_score >= 8
    );
    
    console.log(`  ✅ Generated ${newSamples.length} samples, ${validated.length} passed validation`);
    
    // 4. DB에 저장 (origin 태깅)
    for (const sample of validated) {
      try {
        await storeProblemSample({
          domain,
          subdomain: tech,
          problem: sample,
          quality_score: sample.self_critique?.quality_score || 8,
          origin: 'generated',  // ⭐ AI 생성 표시
          generation: 1,  // ⭐ 1세대
          human_verified: false,  // ⭐ 미검증
        });
        console.log(`    💾 Saved sample to DB (generated, gen 1)`);
      } catch (error) {
        console.error(`    ❌ Failed to save sample:`, error);
      }
    }
    
    samples = [...samples, ...validated];
  }
  
  return samples.slice(0, minSamples);
}

/**
 * 고품질 샘플 생성
 */
async function generateHighQualitySamples(params: {
  tech: string;
  domain: ProjectCategory;
  count: number;
}) {
  const { tech, domain, count } = params;
  
  const domainPromptFn = getDomainPromptFunction(domain);
  const userPrompt = domainPromptFn(
    `Generate ${count} high-quality example problems specifically about ${tech}. 
     These will be used as few-shot examples for future problem generation.
     Focus on exam-grade quality and real-world scenarios.`,
    ''
  );
  
  try {
    const result = await generateWithGPT4o({
      systemPrompt: BASE_SYSTEM_PROMPT + `

ADDITIONAL REQUIREMENTS FOR EXAMPLE GENERATION:
- Generate ONLY example problems with quality_score >= 8
- Include comprehensive alternatives array
- Make problems representative of ${tech} 
- Ensure real exam-like quality`,
      userPrompt,
      temperature: 0.3, // 일관성 중시
      responseFormat: 'json_object',
    });
    
    const parsed = JSON.parse(result.content || '{}');
    return parsed.problems || [];
  } catch (error) {
    console.error(`Failed to generate samples for ${tech}:`, error);
    return [];
  }
}

/**
 * 대량 자동 생성 (초기 시딩용)
 */
export async function bulkAutoGenerate(
  technologies: Array<{ tech: string; domain: ProjectCategory; count: number }>
) {
  const results = [];
  
  for (const { tech, domain, count } of technologies) {
    console.log(`\n📦 Bulk generating: ${tech} (${count} samples)`);
    
    try {
      const samples = await generateHighQualitySamples({ tech, domain, count });
      const validated = samples.filter((s: { self_critique?: { quality_score?: number } }) => s.self_critique?.quality_score && s.self_critique.quality_score >= 8);
      
      for (const sample of validated) {
        await storeProblemSample({
          domain,
          subdomain: tech,
          problem: sample,
          quality_score: sample.self_critique?.quality_score || 8,
          origin: 'generated',
          generation: 1,
          human_verified: false,
        });
      }
      
      results.push({
        tech,
        generated: samples.length,
        saved: validated.length,
      });
      
      console.log(`  ✅ ${validated.length}/${samples.length} saved`);
    } catch (error) {
      console.error(`  ❌ Failed to generate ${tech}:`, error);
      results.push({
        tech,
        generated: 0,
        saved: 0,
        error: String(error),
      });
    }
  }
  
  return results;
}

