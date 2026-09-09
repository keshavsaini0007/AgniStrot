import { documentRepository } from '@/repositories';
import type { Document, FilterParams, PaginatedResponse } from '@/types';

export const documentService = {
  getDocuments: async (params?: FilterParams): Promise<PaginatedResponse<Document>> => {
    return await documentRepository.getDocuments(params);
  },
  getDocumentById: async (id: string): Promise<Document> => {
    return await documentRepository.getDocumentById(id);
  },
};
