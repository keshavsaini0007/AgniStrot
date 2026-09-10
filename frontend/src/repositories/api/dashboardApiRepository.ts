import apiClient, { unwrap } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { DashboardSummary, UserRole } from '@/types';
import { toDashboardSummary, type DashboardRaw } from './dashboardAdapter';

export const dashboardApiRepository = {
  getSummary: async (role: UserRole): Promise<DashboardSummary> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.DASHBOARD.SUMMARY);
      const raw = unwrap<DashboardRaw>(response.data);
      return toDashboardSummary(raw, role);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};