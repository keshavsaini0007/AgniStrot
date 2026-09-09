import { mockSites, delay } from '@/mock/database';
import type { RiskAssessment, TrendPoint, AiSummary } from '@/types';

export const aiMockRepository = {
  getRiskScore: async (siteId: string): Promise<RiskAssessment> => {
    await delay(600);
    const demo: Record<string, { score: number; level: RiskAssessment['riskLevel']; factors: RiskAssessment['factors'] }> = {
      'mine-001': {
        score: 72,
        level: 'high',
        factors: [
          { label: 'Safety checklist failures', score: 62, severity: 'high' },
          { label: 'Critical incidents reported', score: 85, severity: 'high' },
          { label: 'Attendance variance', score: 20, severity: 'low' },
        ],
      },
      'mine-002': {
        score: 45,
        level: 'medium',
        factors: [
          { label: 'Safety checklist failures', score: 30, severity: 'low' },
          { label: 'Critical incidents reported', score: 55, severity: 'medium' },
          { label: 'Attendance variance', score: 25, severity: 'low' },
        ],
      },
    };
    const entry = demo[siteId] ?? { score: 30, level: 'low' as const, factors: [] };
    return {
      siteId,
      riskScore: entry.score,
      riskLevel: entry.level,
      factors: entry.factors,
      explanation: 'Rule-based composite of alerts, checklist failures and incident severity over the last 30 days.',
      recommendations: entry.score >= 60 ? ['Prioritise critical alerts', 'Re-run safety inspection'] : [],
      generatedAt: new Date().toISOString(),
    };
  },

  getTrends: async (): Promise<TrendPoint[]> => {
    await delay(500);
    return [
      { date: '2026-04-15', label: 'Apr', value: 34 },
      { date: '2026-05-15', label: 'May', value: 41 },
      { date: '2026-06-15', label: 'Jun', value: 38 },
      { date: '2026-07-15', label: 'Jul', value: 52 },
      { date: '2026-08-15', label: 'Aug', value: 47 },
    ];
  },

  getSummary: async (): Promise<AiSummary> => {
    await delay(500);
    return {
      totalSites: mockSites.length,
      highRiskSites: 1,
      generatedAt: new Date().toISOString(),
    };
  },
};