import apiClient, { normalizeList, unwrap } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { Alert, FilterParams, PaginatedResponse, ItemResponse } from '@/types';

export const alertApiRepository = {
  getAlerts: async (params?: FilterParams): Promise<PaginatedResponse<Alert>> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ALERTS.BASE, { params });
      return normalizeList<Alert>(response.data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  acknowledge: async (id: string, note?: string): Promise<ItemResponse<Alert>> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.ALERTS.ACKNOWLEDGE(id), { note });
      return { success: true, data: unwrap<Alert>(response.data) };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  resolve: async (id: string, note?: string): Promise<ItemResponse<Alert>> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.ALERTS.RESOLVE(id), { note });
      return { success: true, data: unwrap<Alert>(response.data) };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  escalate: async (id: string, note?: string): Promise<ItemResponse<Alert>> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.ALERTS.ESCALATE(id), { note });
      return { success: true, data: unwrap<Alert>(response.data) };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};