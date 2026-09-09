import { dashboardRepository } from '@/repositories';
import type { DashboardSummary } from '@/types';

export const dashboardService = {
  getSummary: async (): Promise<DashboardSummary> => {
    return await dashboardRepository.getSummary();
  },
};