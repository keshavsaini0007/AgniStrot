import apiClient from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type {
  RiskAssessment,
  SiteTrend,
  AiSummary,
  TrendClassification,
  TrendContributor,
  ForecastProjection,
  TrendSeries,
} from '@/types';

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
  siteId?: string;
  period?: string;
  inspections: { total: number; passed: number; failed: number; percentChange: number };
  incidents: { total: number; critical: number; resolved: number; percentChange: number };
  alerts: { total: number; open: number; avgResolutionTimeHours: number; percentChange: number };
  classification?: TrendClassification;
  contributors?: TrendContributor[];
  forecast?: ForecastProjection;
  series?: TrendSeries;
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

  getTrends: async (siteId: string): Promise<SiteTrend> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.AI.TRENDS(siteId));
      const raw = (response.data?.data ?? response.data) as BackendTrendData;
      return {
        siteId: raw.siteId ?? siteId,
        period: raw.period ?? '30days',
        inspections: raw.inspections ?? { total: 0, passed: 0, failed: 0, percentChange: 0 },
        incidents: raw.incidents ?? { total: 0, critical: 0, resolved: 0, percentChange: 0 },
        alerts: raw.alerts ?? { total: 0, open: 0, avgResolutionTimeHours: 0, percentChange: 0 },
        classification: raw.classification ?? {
          method: 'rule-based',
          label: 'Trend based on historical rule-based analysis.',
          overall: 'insufficient-data',
          confidence: 'low',
          perCategory: {
            inspections: { direction: 'insufficient-data', percentChange: null, newActivity: false },
            incidents: { direction: 'insufficient-data', percentChange: null, newActivity: false },
            alerts: { direction: 'insufficient-data', percentChange: null, newActivity: false },
          },
        },
        contributors: Array.isArray(raw.contributors) ? raw.contributors : [],
        forecast: raw.forecast ?? {
          method: 'insufficient-data',
          baselineScore: 0,
          projectedScore: null,
          projectedBand: null,
          bandTrend: 'insufficient-data',
          next30d: { inspections: null, incidents: null, alerts: null },
          confidence: 'low',
          label: 'Statistical projection of the rule-based risk score.',
        },
        series: raw.series ?? {
          labels: [],
          inspections: [],
          incidents: [],
          alerts: [],
          score: [],
        },
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getSummary: async (): Promise<AiSummary> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.AI.SUMMARY);
      const payload = response.data?.data ?? response.data;
      const generatedAt = new Date().toISOString();
      if (Array.isArray(payload)) {
        return {
          totalSites: payload.length,
          highRiskSites: payload.filter(
            (s) => s.riskLevel === 'HIGH' || s.riskLevel === 'CRITICAL'
          ).length,
          generatedAt,
        };
      }
      const summary = (payload ?? {}) as Partial<AiSummary>;
      return {
        totalSites: summary.totalSites ?? 0,
        highRiskSites: summary.highRiskSites ?? 0,
        generatedAt: summary.generatedAt ?? generatedAt,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};