import type { Document, FilterParams, PaginatedResponse } from '@/types';
import { mockDocuments, delay } from '@/mock/database';

let documents = [...mockDocuments];

export const documentMockRepository = {
  getDocuments: async (params?: FilterParams): Promise<PaginatedResponse<Document>> => {
    await delay(400);
    let filtered = [...documents];
    if (params?.search) {
      const s = params.search.toLowerCase();
      filtered = filtered.filter((d) => d.name.toLowerCase().includes(s) || d.category.toLowerCase().includes(s));
    }
    if (params?.mineId) {
      filtered = filtered.filter((d) => d.mineId === params.mineId);
    }
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const start = (page - 1) * limit;
    return {
      success: true,
      data: filtered.slice(start, start + limit),
      meta: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) },
    };
  },
  getDocumentById: async (id: string): Promise<Document> => {
    await delay(300);
    const doc = documents.find((d) => d.id === id);
    if (!doc) throw new Error('Document not found');
    return doc;
  },
};
