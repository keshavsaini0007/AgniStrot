import { dashboardRepository } from '@/repositories';
import type { DashboardSummary, UserRole } from '@/types';

export const dashboardService = {
  getSummary: async (role: UserRole): Promise<DashboardSummary> => {
    return await dashboardRepository.getSummary(role);
  },
};