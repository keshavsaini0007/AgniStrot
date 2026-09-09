import { aiRepository } from '@/repositories';
import type { RiskAssessment, TrendPoint, AiSummary } from '@/types';

export const aiService = {
  getRiskScore: async (siteId: string): Promise<RiskAssessment> => {
    return await aiRepository.getRiskScore(siteId);
  },

  getTrends: async (siteId: string): Promise<TrendPoint[]> => {
    return await aiRepository.getTrends(siteId);
  },

  getSummary: async (): Promise<AiSummary> => {
    return await aiRepository.getSummary();
  },
};