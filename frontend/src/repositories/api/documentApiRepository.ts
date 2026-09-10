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

  ingest: async (file: File, siteId: string): Promise<ItemResponse<OcrDocument>> => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('siteId', siteId);
      // Let axios set `multipart/form-data; boundary=...` itself — a manual
      // Content-Type without the boundary breaks multer on the backend.
      const response = await apiClient.post(API_ENDPOINTS.DOCUMENTS.INGEST, formData, {
        headers: { 'Content-Type': undefined },
      });
      return { success: true, data: unwrap<OcrDocument>(response.data) };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  confirm: async (id: string, fields: { fieldName: string; value: string }[]): Promise<ItemResponse<OcrDocument>> => {
    try {
      // Backend contract: `{ correctedFields, reviewStatus }` — not a bare array.
      const correctedFields: Record<string, unknown> = {};
      fields.forEach((f) => {
        correctedFields[f.fieldName] = f.value;
      });
      const response = await apiClient.post(API_ENDPOINTS.DOCUMENTS.CONFIRM(id), {
        correctedFields,
        reviewStatus: 'confirmed',
      });
      return { success: true, data: unwrap<OcrDocument>(response.data) };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};