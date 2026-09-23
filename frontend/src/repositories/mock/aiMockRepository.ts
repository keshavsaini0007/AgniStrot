import { mockSites, delay } from '@/mock/database';
import type { RiskAssessment, SiteTrend, AiSummary } from '@/types';

export const aiMockRepository = {
  getRiskScore: async (siteId: string): Promise<RiskAssessment> => {
    await delay(600);
    const demo: Record<string, { score: number; level: RiskAssessment['riskLevel']; factors: RiskAssessment['factors']; recurringHazards?: number }> = {
      'mine-001': {
        score: 72,
        level: 'high',
        recurringHazards: 1, // matches mock alert-007 (RECURRING_HAZARD)
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
      recurringHazards: entry.recurringHazards,
      explanation: 'Rule-based composite of alerts, checklist failures and incident severity over the last 30 days.',
      recommendations: entry.score >= 60 ? ['Prioritise critical alerts', 'Re-run safety inspection'] : [],
      generatedAt: new Date().toISOString(),
    };
  },

  getTrends: async (siteId: string): Promise<SiteTrend> => {
    await delay(500);
    return {
      siteId,
      period: '30days',
      inspections: { total: 12, passed: 9, failed: 3, percentChange: 20 },
      incidents: { total: 4, critical: 1, resolved: 2, percentChange: 33 },
      alerts: { total: 18, open: 5, avgResolutionTimeHours: 9, percentChange: 12 },
      classification: {
        method: 'rule-based',
        label: 'Trend based on historical rule-based analysis — not a prediction from a machine-learning model.',
        overall: 'increasing',
        confidence: 'medium',
        perCategory: {
          inspections: { direction: 'increasing', percentChange: 20, newActivity: false },
          incidents: { direction: 'increasing', percentChange: 33, newActivity: false },
          alerts: { direction: 'stable', percentChange: 12, newActivity: false },
        },
      },
      contributors: [
        {
          key: 'repeat_violations',
          label: 'Repeat safety violations',
          direction: 'increasing',
          magnitude: 'high',
          count: 3,
          detail: '3 repeat-violation alerts in the last 30 days.',
        },
        {
          key: 'incident_frequency',
          label: 'Incident frequency',
          direction: 'increasing',
          magnitude: 'medium',
          count: 4,
          detail: '4 incidents in 30 days (+33% rate change vs previous window).',
        },
        {
          key: 'overdue_corrective_actions',
          label: 'Overdue corrective actions',
          direction: 'increasing',
          magnitude: 'medium',
          count: 2,
          detail: '2 open corrective actions past the SLA resolution deadline.',
        },
      ],
      forecast: {
        method: 'linear-regression',
        baselineScore: 58,
        projectedScore: 66,
        projectedBand: 'HIGH',
        bandTrend: 'increasing',
        next30d: { inspections: 14, incidents: 5, alerts: 20 },
        confidence: 'medium',
        label: 'Statistical projection (linear trend / moving average) of the rule-based risk score — not ML prediction.',
      },
      series: {
        labels: ['Jun 1', 'Jun 8', 'Jun 15', 'Jun 22', 'Jun 29', 'Jul 6', 'Jul 13', 'Jul 20', 'Jul 27', 'Aug 3', 'Aug 10', 'Aug 17', 'Aug 24'],
        inspections: [1, 0, 1, 2, 1, 1, 2, 1, 2, 2, 3, 2, 4],
        incidents: [0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 2, 1, 2],
        alerts: [1, 2, 1, 2, 2, 1, 2, 2, 3, 2, 3, 4, 3],
        score: [22, 27, 25, 30, 33, 31, 38, 36, 42, 45, 44, 51, 55],
      },
    };
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