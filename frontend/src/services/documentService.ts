import { documentRepository } from '@/repositories';
import type { OcrDocument, FilterParams, PaginatedResponse, ItemResponse } from '@/types';

export const documentService = {
  getDocuments: async (params?: FilterParams): Promise<PaginatedResponse<OcrDocument>> => {
    return await documentRepository.getDocuments(params);
  },

  ingest: async (file: File, siteId: string): Promise<ItemResponse<OcrDocument>> => {
    return await documentRepository.ingest(file, siteId);
  },

  confirm: async (id: string, fields: { fieldName: string; value: string }[]): Promise<ItemResponse<OcrDocument>> => {
    return await documentRepository.confirm(id, fields);
  },
};