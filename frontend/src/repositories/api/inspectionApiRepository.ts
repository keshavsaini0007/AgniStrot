import apiClient, { normalizeList, unwrap } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { Inspection, FilterParams, PaginatedResponse, ItemResponse, InspectionSyncPayload } from '@/types';

/**
 * Derives the display-only `failedCount` from the checklist when the backend
 * omits it (the mock data pre-populates it; the type marks it "derived").
 */
const withFailedCount = (inspection: Inspection): Inspection => {
  const failed =
    typeof inspection.failedCount === 'number'
      ? inspection.failedCount
      : (inspection.checklist ?? []).filter((c) => c.result === 'fail').length;
  return { ...inspection, failedCount: failed };
};

export const inspectionApiRepository = {
  getInspections: async (params?: FilterParams): Promise<PaginatedResponse<Inspection>> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.INSPECTIONS.BASE, { params });
      const normalized = normalizeList<Inspection>(response.data);
      return { ...normalized, data: normalized.data.map(withFailedCount) };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getInspectionById: async (id: string): Promise<ItemResponse<Inspection>> => {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.INSPECTIONS.BASE}/${id}`);
      return { success: true, data: withFailedCount(unwrap<Inspection>(response.data)) };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  syncInspections: async (payload: InspectionSyncPayload[]): Promise<ItemResponse<Inspection[]>> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.INSPECTIONS.SYNC, { records: payload });
      const list = unwrap<Inspection[]>(response.data, []);
      return { success: true, data: (Array.isArray(list) ? list : []).map(withFailedCount) };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};