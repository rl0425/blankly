import OpenAI from 'openai';

let openaiInstance: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}

export interface GenerateProblemsParams {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  responseFormat?: 'json_object';
  stage?: string;
  maxTokens?: number;
}

/**
 * 단계별 최적 토큰 수 계산
 */
function getOptimalTokens(stage?: string): number {
  switch (stage) {
    case 'extraction': return 1000;   // 개념만 추출
    case 'design': return 1500;       // 구조만 설계
    case 'generation': return 3000;   // 최종 생성
    case 'validation': return 500;    // Validator 검증
    default: return 2000;             // 기본값
  }
}

/**
 * Sleep 유틸리티
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateWithGPT4o(params: GenerateProblemsParams) {
  const { 
    systemPrompt, 
    userPrompt, 
    temperature = 0.7, 
    responseFormat,
    stage,
    maxTokens 
  } = params;

  const optimalTokens = maxTokens || getOptimalTokens(stage);
  const maxRetries = 3;
  let lastError: Error | unknown;
  
  // 비용 절감: GPT-4o-mini 사용 (약 30배 저렴, 품질은 거의 동일)
  // Input: $0.15/1M tokens, Output: $0.60/1M tokens
  const model = 'gpt-4o-mini';

  // 재시도 로직 (지수 백오프)
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature,
        response_format: responseFormat ? { type: responseFormat } : undefined,
        max_tokens: optimalTokens,
      });

      return {
        content: response.choices[0].message.content,
        usage: response.usage,
      };
    } catch (error: unknown) {
      lastError = error;
      
      if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
        // Rate limit: 지수 백오프
        const delay = Math.pow(2, attempt) * 1000;  // 2초, 4초, 8초
        console.warn(`⚠️  Rate limit hit (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
        
        if (attempt < maxRetries) {
          await sleep(delay);
          continue;
        }
        
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      }
      
      // 다른 에러는 즉시 throw
      throw error;
    }
  }
  
  throw lastError;
}

// 임베딩 생성 함수 (향후 RAG 시스템용)
export async function createEmbedding(text: string) {
  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  
  return response.data[0].embedding;
}

