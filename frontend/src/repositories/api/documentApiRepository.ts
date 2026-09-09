import apiClient, { normalizeList, unwrap } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { OcrDocument, FilterParams, PaginatedResponse, ItemResponse } from '@/types';

export const documentApiRepository = {
  getDocuments: async (params?: FilterParams): Promise<PaginatedResponse<OcrDocument>> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.DOCUMENTS.BASE, { params });
      return normalizeList<OcrDocument>(response.data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  ingest: async (file: File): Promise<ItemResponse<OcrDocument>> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post(API_ENDPOINTS.DOCUMENTS.INGEST, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return { success: true, data: unwrap<OcrDocument>(response.data) };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  confirm: async (id: string, fields: { fieldName: string; value: string }[]): Promise<ItemResponse<OcrDocument>> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.DOCUMENTS.CONFIRM(id), fields);
      return { success: true, data: unwrap<OcrDocument>(response.data) };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};