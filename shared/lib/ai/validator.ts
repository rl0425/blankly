/**
 * Validator Agent - Self-critique 이중 검증
 * 
 * 목적:
 * - Self-critique 과신 방지
 * - 품질 낮은 문제 필터링
 * - 20% 샘플링으로 비용 최소화
 */

import { generateWithGPT4o } from '@/shared/lib/openai/client';
import type { GeneratedProblem } from '@/shared/lib/prompts/base';

export interface ValidationResult {
  actual_score: number;
  issues: string[];
  recommendation: 'accept' | 'reject' | 'revise';
}

/**
 * 문제 검증 (엄격한 평가)
 */
export async function validateProblem(problem: GeneratedProblem): Promise<ValidationResult> {
  const prompt = `You are a HARSH exam question reviewer. Most problems are 5-7 quality range.

Rate this problem STRICTLY:
1. Is the correct answer unambiguous? (0-10)
2. Are distractors plausible but clearly wrong? (0-10)
3. Is this real exam-grade quality? (0-10)
4. Is the explanation clear and includes the answer? (0-10)

Problem to review:
${JSON.stringify(problem, null, 2)}

Output JSON only:
{
  "actual_score": 1-10 (average of above ratings),
  "issues": ["specific issue 1", "specific issue 2", ...],
  "recommendation": "accept" | "reject" | "revise"
}

Be harsh - only exceptional problems should score 9-10.`;
  
  try {
    const result = await generateWithGPT4o({
      systemPrompt: 'You are a strict quality validator. Be harsh and critical.',
      userPrompt: prompt,
      temperature: 0.3,
      responseFormat: 'json_object',
      stage: 'validation',
      maxTokens: 500,
    });
    
    const validation = JSON.parse(result.content || '{}');
    return {
      actual_score: validation.actual_score || 0,
      issues: validation.issues || [],
      recommendation: validation.recommendation || 'reject',
    };
  } catch (error) {
    console.error('Validation failed:', error);
    // 검증 실패 시 보수적으로 reject
    return {
      actual_score: 0,
      issues: ['Validation service failed'],
      recommendation: 'reject',
    };
  }
}

/**
 * 샘플링 기반 문제 검증
 * 
 * 전략:
 * - Low score (< 8) 문제: 100% 검증
 * - 나머지: 20% 무작위 샘플링
 */
export async function validateProblemsWithSampling(
  problems: GeneratedProblem[]
): Promise<{ validated: GeneratedProblem[]; rejected: number }> {
  console.log('🔍 Starting validator agent (sampling mode)...');
  
  // 1. Low score 문제 선별
  const lowScoreProblems = problems.filter(
    p => p.self_critique && p.self_critique.quality_score < 8
  );
  
  // 2. 나머지에서 20% 샘플링
  const highScoreProblems = problems.filter(
    p => !p.self_critique || p.self_critique.quality_score >= 8
  );
  const sampledProblems = highScoreProblems.filter(() => Math.random() < 0.2);
  
  // 3. 검증 대상 (중복 제거)
  const toValidate = [...new Set([...lowScoreProblems, ...sampledProblems])];
  
  console.log(`  📊 Validating ${toValidate.length}/${problems.length} problems`);
  console.log(`    - Low score: ${lowScoreProblems.length}`);
  console.log(`    - Sampled: ${sampledProblems.length}`);
  
  // 4. 검증 실행
  const rejectedIds = new Set<GeneratedProblem>();
  
  for (const problem of toValidate) {
    const validation = await validateProblem(problem);
    
    if (validation.actual_score < 7 || validation.recommendation === 'reject') {
      rejectedIds.add(problem);
      console.warn(`  ❌ Validator rejected problem:`, {
        selfScore: problem.self_critique?.quality_score,
        validatorScore: validation.actual_score,
        issues: validation.issues,
      });
    }
  }
  
  // 5. 통과한 문제만 반환
  const validated = problems.filter(p => !rejectedIds.has(p));
  
  console.log(`  ✅ Validation complete: ${validated.length}/${problems.length} passed`);
  
  return {
    validated,
    rejected: rejectedIds.size,
  };
}


