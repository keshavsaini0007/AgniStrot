import apiClient, { unwrap } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type {
  AddHazardControlInput,
  Hazard,
  HazardDashboard,
  HazardListParams,
  ItemResponse,
  PaginatedResponse,
  RegisterHazardInput,
  UpdateHazardInput,
} from '@/types';

// Feature 06 — hazard register (backend /hazards routes). The list endpoint
// returns FLAT pagination ({ data, total, page, limit }) like /evidence and
// /documents, so the meta envelope is built explicitly here.
export const hazardApiRepository = {
  list: async (params?: HazardListParams): Promise<PaginatedResponse<Hazard>> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.HAZARDS.BASE, { params });
      const body = response.data ?? {};
      const rows: Hazard[] = Array.isArray(body.data) ? body.data : [];
      const total = typeof body.total === 'number' ? body.total : rows.length;
      const page = typeof body.page === 'number' ? body.page : params?.page ?? 1;
      const limit = typeof body.limit === 'number' ? body.limit : params?.limit ?? 20;
      return {
        success: true,
        data: rows,
        meta: {
          page,
          limit,
          total,
          totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
        },
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  get: async (id: string): Promise<ItemResponse<Hazard>> => {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.HAZARDS.BASE}/${id}`);
      return { success: true, data: unwrap<Hazard>(response.data) };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getDashboard: async (params?: { siteId?: string }): Promise<ItemResponse<HazardDashboard>> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.HAZARDS.DASHBOARD, { params });
      return { success: true, data: unwrap<HazardDashboard>(response.data) };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  register: async (input: RegisterHazardInput): Promise<ItemResponse<Hazard>> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.HAZARDS.BASE, input);
      return { success: true, data: unwrap<Hazard>(response.data) };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  update: async (id: string, input: UpdateHazardInput): Promise<ItemResponse<Hazard>> => {
    try {
      const response = await apiClient.patch(`${API_ENDPOINTS.HAZARDS.BASE}/${id}`, input);
      return { success: true, data: unwrap<Hazard>(response.data) };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  addControl: async (id: string, input: AddHazardControlInput): Promise<ItemResponse<Hazard>> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.HAZARDS.CONTROLS(id), input);
      return { success: true, data: unwrap<Hazard>(response.data) };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  implementControl: async (id: string, controlId: string): Promise<ItemResponse<Hazard>> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.HAZARDS.IMPLEMENT(id, controlId), {});
      return { success: true, data: unwrap<Hazard>(response.data) };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  assessEffectiveness: async (id: string): Promise<ItemResponse<Hazard>> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.HAZARDS.EFFECTIVENESS(id), {});
      return { success: true, data: unwrap<Hazard>(response.data) };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  close: async (id: string, closureNote: string): Promise<ItemResponse<Hazard>> => {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.HAZARDS.CLOSE(id),
        { closureNote },
      );
      return { success: true, data: unwrap<Hazard>(response.data) };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};