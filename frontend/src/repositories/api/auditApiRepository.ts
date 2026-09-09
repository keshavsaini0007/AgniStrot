import apiClient, { normalizeList } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { AuditLog, FilterParams, PaginatedResponse } from '@/types';

export const auditApiRepository = {
  getAuditLogs: async (params?: FilterParams): Promise<PaginatedResponse<AuditLog>> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.AUDIT.BASE, { params });
      return normalizeList<AuditLog>(response.data);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};