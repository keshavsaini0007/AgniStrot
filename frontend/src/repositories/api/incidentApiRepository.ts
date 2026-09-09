import apiClient, { normalizeList, unwrap } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { Incident, FilterParams, PaginatedResponse, ItemResponse, IncidentSyncPayload } from '@/types';

export const incidentApiRepository = {
  getIncidents: async (params?: FilterParams): Promise<PaginatedResponse<Incident>> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.INCIDENTS.BASE, { params });
      return normalizeList<Incident>(response.data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getIncidentById: async (id: string): Promise<ItemResponse<Incident>> => {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.INCIDENTS.BASE}/${id}`);
      return { success: true, data: unwrap<Incident>(response.data) };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  syncIncidents: async (payload: IncidentSyncPayload[]): Promise<ItemResponse<Incident[]>> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.INCIDENTS.SYNC, { records: payload });
      return { success: true, data: unwrap<Incident[]>(response.data, []) };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};