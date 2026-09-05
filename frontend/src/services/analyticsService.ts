import { analyticsRepository } from '@/repositories';
import type { DashboardData, RiskAssessment } from '@/types';

export const analyticsService = {
  getDashboard: async (): Promise<DashboardData> => {
    return await analyticsRepository.getDashboard();
  },

  getCompliance: async (mineId?: string): Promise<any> => {
    return await analyticsRepository.getCompliance(mineId);
  },

  getRisk: async (mineId?: string): Promise<RiskAssessment[]> => {
    return await analyticsRepository.getRisk(mineId);
  },

  getInspections: async (): Promise<any> => {
    return await analyticsRepository.getInspections();
  },
};