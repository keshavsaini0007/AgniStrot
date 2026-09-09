import apiClient, { normalizeList, unwrap } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { Alert, FilterParams, PaginatedResponse, ItemResponse } from '@/types';

export const alertApiRepository = {
  getAlerts: async (params?: FilterParams): Promise<PaginatedResponse<Alert>> => {
    try {
      // The backend list endpoint accepts severity/status/siteId/ruleCode/limit.
      // `search` is mapped to `ruleCode` (the only free-text field the backend filters on).
      const response = await apiClient.get(API_ENDPOINTS.ALERTS.BASE, {
        params: {
          siteId: params?.siteId || undefined,
          severity: params?.severity || undefined,
          status: params?.status || undefined,
          ruleCode: params?.search || undefined,
          limit: params?.limit || 50,
        },
      });
      return normalizeList<Alert>(response.data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  acknowledge: async (id: string, note?: string): Promise<ItemResponse<Alert>> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.ALERTS.ACKNOWLEDGE(id), { note });
      return { success: true, data: unwrap<Alert>(response.data, response.data) };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  resolve: async (id: string, note?: string): Promise<ItemResponse<Alert>> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.ALERTS.RESOLVE(id), { resolutionNote: note });
      return { success: true, data: unwrap<Alert>(response.data, response.data) };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  escalate: async (id: string, note?: string): Promise<ItemResponse<Alert>> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.ALERTS.ESCALATE(id), { note });
      return { success: true, data: unwrap<Alert>(response.data, response.data) };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};