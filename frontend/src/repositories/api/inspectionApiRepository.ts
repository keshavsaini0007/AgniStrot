import apiClient, { normalizeList, unwrap } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { Inspection, FilterParams, PaginatedResponse, ItemResponse, InspectionSyncPayload } from '@/types';

export const inspectionApiRepository = {
  getInspections: async (params?: FilterParams): Promise<PaginatedResponse<Inspection>> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.INSPECTIONS.BASE, { params });
      return normalizeList<Inspection>(response.data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getInspectionById: async (id: string): Promise<ItemResponse<Inspection>> => {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.INSPECTIONS.BASE}/${id}`);
      return { success: true, data: unwrap<Inspection>(response.data) };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  syncInspections: async (payload: InspectionSyncPayload[]): Promise<ItemResponse<Inspection[]>> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.INSPECTIONS.SYNC, { records: payload });
      return { success: true, data: unwrap<Inspection[]>(response.data, []) };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};