import apiClient, { unwrap } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type {
  Evidence,
  EvidenceDashboard,
  EvidenceVerifyResult,
  FilterParams,
  PaginatedResponse,
  ItemResponse,
  VerifyAllSummary,
} from '@/types';

// Feature 05 — evidence integrity (backend /evidence routes). The list endpoint
// returns FLAT pagination ({ data, total, page, limit }) like /documents, so the
// meta envelope is built explicitly here — normalizeList's fallback would pin
// page 1 for flat bodies.
export const evidenceApiRepository = {
  getEvidence: async (params?: FilterParams): Promise<PaginatedResponse<Evidence>> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.EVIDENCE.BASE, { params });
      const body = response.data ?? {};
      const rows: Evidence[] = Array.isArray(body.data) ? body.data : [];
      const total = typeof body.total === 'number' ? body.total : rows.length;
      const page = typeof body.page === 'number' ? body.page : 1;
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

  getDashboard: async (params?: FilterParams): Promise<ItemResponse<EvidenceDashboard>> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.EVIDENCE.DASHBOARD, { params });
      return { success: true, data: unwrap<EvidenceDashboard>(response.data) };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  verify: async (id: string): Promise<ItemResponse<EvidenceVerifyResult>> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.EVIDENCE.VERIFY(id), {});
      return { success: true, data: unwrap<EvidenceVerifyResult>(response.data) };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  verifyAll: async (): Promise<ItemResponse<VerifyAllSummary>> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.EVIDENCE.VERIFY_ALL, {});
      return { success: true, data: unwrap<VerifyAllSummary>(response.data) };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
