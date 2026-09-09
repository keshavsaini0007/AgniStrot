import apiClient from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { StatutoryReportQuery } from '@/types';

export const reportApiRepository = {
  /** The backend returns a raw PDF buffer — returned as a Blob for download. */
  getStatutoryReport: async (query: StatutoryReportQuery): Promise<Blob> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.REPORTS.STATUTORY, {
        params: query,
        responseType: 'blob',
      });
      return response.data as Blob;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};