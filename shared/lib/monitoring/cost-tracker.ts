/**
 * 비용 추적 시스템
 * 
 * 기능:
 * - OpenAI API 사용량 추적
 * - 단계별 비용 계산
 * - DB에 기록 저장
 */

import { createClient } from '@/shared/lib/supabase/server';

export interface CostTrackingParams {
  userId: string;
  stage: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export class CostTracker {
  /**
   * 생성 비용 추적 및 저장
   */
  async trackGeneration(params: CostTrackingParams): Promise<number> {
    const cost = this.calculateCost(params);
    
    try {
      const supabase = await createClient();
      const { error } = await supabase.from('generation_costs').insert({
        user_id: params.userId,
        stage: params.stage,
        input_tokens: params.inputTokens,
        output_tokens: params.outputTokens,
        cost_usd: cost,
        model: params.model,
      });
      
      if (error) {
        console.error('Failed to track cost:', error);
      }
    } catch (error) {
      console.error('Cost tracking error:', error);
    }
    
    return cost;
  }
  
  /**
   * 비용 계산
   * GPT-4o 가격: $5/1M input tokens, $15/1M output tokens
   */
  private calculateCost(params: CostTrackingParams): number {
    const { inputTokens, outputTokens, model } = params;
    
    // GPT-4o 가격표
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 5, output: 15 },
      'gpt-4o-mini': { input: 0.15, output: 0.6 },
    };
    
    const modelPricing = pricing[model] || pricing['gpt-4o'];
    
    const inputCost = (inputTokens / 1000000) * modelPricing.input;
    const outputCost = (outputTokens / 1000000) * modelPricing.output;
    
    return inputCost + outputCost;
  }
  
  /**
   * 사용자의 최근 비용 조회
   */
  async getUserCosts(userId: string, days: number = 30): Promise<{
    totalCost: number;
    byStage: Record<string, number>;
    totalTokens: number;
  }> {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('generation_costs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());
      
      if (error || !data) {
        return { totalCost: 0, byStage: {}, totalTokens: 0 };
      }
      
      const totalCost = data.reduce((sum, row) => sum + Number(row.cost_usd), 0);
      const totalTokens = data.reduce((sum, row) => sum + row.input_tokens + row.output_tokens, 0);
      
      const byStage: Record<string, number> = {};
      data.forEach(row => {
        byStage[row.stage] = (byStage[row.stage] || 0) + Number(row.cost_usd);
      });
      
      return { totalCost, byStage, totalTokens };
    } catch (error) {
      console.error('Failed to get user costs:', error);
      return { totalCost: 0, byStage: {}, totalTokens: 0 };
    }
  }
}

// 싱글톤 인스턴스
export const costTracker = new CostTracker();


