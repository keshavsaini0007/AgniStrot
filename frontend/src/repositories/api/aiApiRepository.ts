import apiClient from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { RiskAssessment, TrendPoint, AiSummary } from '@/types';

interface BackendRiskScore {
  siteId: string;
  score: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  breakdown: {
    alertScore: number;
    inspectionScore: number;
    incidentScore: number;
    resolutionBonus: number;
  };
  metrics: {
    totalAlerts: number;
    unresolvedAlerts: number;
    failedInspections: number;
    criticalIncidents: number;
    resolutionRate: number;
  };
}

interface BackendTrendData {
  siteId: string;
  period: string;
  inspections: { total: number; passed: number; failed: number; percentChange: number };
  incidents: { total: number; critical: number; resolved: number; percentChange: number };
  alerts: { total: number; open: number; avgResolutionTimeHours: number; percentChange: number };
}

const FACTOR_LABELS: Array<{ label: string; key: keyof BackendRiskScore['breakdown'] }> = [
  { label: 'Alert volume', key: 'alertScore' },
  { label: 'Checklist failures', key: 'inspectionScore' },
  { label: 'Incident severity', key: 'incidentScore' },
  { label: 'Resolution bonus', key: 'resolutionBonus' },
];

const toRiskAssessment = (input: BackendRiskScore): RiskAssessment => ({
  siteId: String(input.siteId),
  riskScore: input.score,
  riskLevel: input.riskLevel.toLowerCase() as RiskAssessment['riskLevel'],
  factors: FACTOR_LABELS.map(({ label, key }) => ({
    label,
    score: input.breakdown[key],
    severity: input.breakdown[key] >= 80 ? 'high' : input.breakdown[key] >= 40 ? 'medium' : 'low',
  })),
  explanation: `${input.metrics.failedInspections} failed inspection(s), ${input.metrics.criticalIncidents} critical incident(s), ${input.metrics.resolutionRate}% alert resolution over the window.`,
  recommendations:
    input.metrics.failedInspections > 0
      ? ['Review failing checklist items', 'Re-run safety inspection on site']
      : ['Maintain current inspection cadence'],
  generatedAt: new Date().toISOString(),
});

export const aiApiRepository = {
  getRiskScore: async (siteId: string): Promise<RiskAssessment> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.AI.RISK_SCORE(siteId));
      const raw = response.data?.data ?? response.data;
      return toRiskAssessment(raw as BackendRiskScore);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getTrends: async (siteId: string): Promise<TrendPoint[]> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.AI.TRENDS(siteId));
      const raw = (response.data?.data ?? response.data) as BackendTrendData;
      return [
        { date: '30d', label: 'inspections', value: Math.min(100, raw.inspections.total * 10) },
        { date: '30d', label: 'incidents', value: Math.min(100, raw.incidents.total * 10) },
        { date: '30d', label: 'alerts', value: Math.min(100, raw.alerts.total + raw.alerts.open) },
      ];
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getSummary: async (): Promise<AiSummary> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.AI.SUMMARY);
      const scores = (response.data?.data ?? response.data) as BackendRiskScore[];
      const now = new Date();
      now.setDate(now.getDate() - 30);
      return {
        totalSites: scores.length,
        highRiskSites: scores.filter((s) => s.riskLevel === 'HIGH' || s.riskLevel === 'CRITICAL').length,
        generatedAt: now.toISOString(),
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};