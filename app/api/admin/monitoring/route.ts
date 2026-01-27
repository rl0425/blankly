/**
 * 모니터링 대시보드 API
 * 
 * 기능:
 * - 비용 통계 조회
 * - 품질 메트릭 조회
 * - 사용 현황 분석
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    // ===== 비용 통계 =====
    const { data: costs } = await supabase
      .from('generation_costs')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate);
    
    const totalCost = costs?.reduce((sum, c) => sum + Number(c.cost_usd), 0) || 0;
    const totalTokens = costs?.reduce((sum, c) => sum + c.input_tokens + c.output_tokens, 0) || 0;
    
    // 단계별 비용
    const byStage: Record<string, { cost: number; tokens: number; count: number }> = {};
    costs?.forEach(row => {
      if (!byStage[row.stage]) {
        byStage[row.stage] = { cost: 0, tokens: 0, count: 0 };
      }
      byStage[row.stage].cost += Number(row.cost_usd);
      byStage[row.stage].tokens += row.input_tokens + row.output_tokens;
      byStage[row.stage].count += 1;
    });
    
    // 일별 트렌드
    const dailyTrend: Record<string, number> = {};
    costs?.forEach(row => {
      const date = new Date(row.created_at).toISOString().split('T')[0];
      dailyTrend[date] = (dailyTrend[date] || 0) + Number(row.cost_usd);
    });
    
    // ===== 품질 통계 =====
    const { data: quality } = await supabase
      .from('quality_metrics')
      .select('*')
      .gte('created_at', startDate);
    
    const avgSelfCritique = quality?.reduce((sum, q) => sum + (q.self_critique_avg || 0), 0) / (quality?.length || 1);
    const avgValidator = quality?.reduce((sum, q) => sum + (q.validator_avg || 0), 0) / (quality?.length || 1);
    const totalRejected = quality?.reduce((sum, q) => sum + (q.problems_rejected || 0), 0) || 0;
    const totalGenerated = quality?.reduce((sum, q) => sum + (q.total_problems || 0), 0) || 0;
    const rejectionRate = totalGenerated > 0 ? (totalRejected / totalGenerated) * 100 : 0;
    
    // ===== 샘플 통계 =====
    const { data: samples } = await supabase
      .from('problem_samples')
      .select('origin, generation');
    
    const humanSamples = samples?.filter(s => s.origin === 'human').length || 0;
    const generatedSamples = samples?.filter(s => s.origin === 'generated').length || 0;
    
    return NextResponse.json({
      period: { days, startDate },
      costs: {
        total_usd: parseFloat(totalCost.toFixed(4)),
        total_tokens: totalTokens,
        by_stage: byStage,
        daily_trend: dailyTrend,
      },
      quality: {
        avg_self_critique: parseFloat(avgSelfCritique.toFixed(2)),
        avg_validator: parseFloat(avgValidator.toFixed(2)),
        rejection_rate: parseFloat(rejectionRate.toFixed(2)),
        total_rejected: totalRejected,
        total_generated: totalGenerated,
      },
      samples: {
        human: humanSamples,
        generated: generatedSamples,
        total: humanSamples + generatedSamples,
        human_ratio: humanSamples / (humanSamples + generatedSamples) * 100,
      },
    });
  } catch (error) {
    console.error('Monitoring API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring data' },
      { status: 500 }
    );
  }
}


