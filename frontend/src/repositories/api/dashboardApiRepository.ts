import apiClient, { unwrap } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { DashboardSummary } from '@/types';

export const dashboardApiRepository = {
  getSummary: async (): Promise<DashboardSummary> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.DASHBOARD.SUMMARY);
      return unwrap<DashboardSummary>(response.data);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};