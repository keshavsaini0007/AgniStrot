import { delay } from '@/mock/database';
import type { OcrDocument, FilterParams, PaginatedResponse, ItemResponse } from '@/types';

let documents: OcrDocument[] = [
  {
    id: 'doc-001',
    siteId: 'mine-001',
    sourceImageUrl: '/documents/entry-pass-4412.jpg',
    extractedFields: { name: 'Suresh Yadav', passNo: 'EP-4412', siteId: 'mine-001' },
    confidence: 0.94,
    reviewStatus: 'confirmed',
    createdAt: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'doc-002',
    siteId: 'mine-002',
    sourceImageUrl: '/documents/discharge-permit-2293.png',
    extractedFields: { permitNo: 'D-2293', siteId: 'mine-002' },
    confidence: 0.87,
    reviewStatus: 'pending',
    createdAt: '2026-09-02T11:30:00.000Z',
  },
];

export const documentMockRepository = {
  getDocuments: async (params?: FilterParams): Promise<PaginatedResponse<OcrDocument>> => {
    await delay(400);
    let filtered = [...documents];
    if (params?.status) {
      filtered = filtered.filter((d) => d.reviewStatus === params.status);
    }
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    return {
      success: true,
      data: filtered.slice((page - 1) * limit, page * limit),
      meta: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) },
    };
  },

  ingest: async (file: File, siteId?: string): Promise<ItemResponse<OcrDocument>> => {
    await delay(900);
    const docSiteId = siteId ?? 'mine-001';
    const doc: OcrDocument = {
      id: `doc-${String(documents.length + 1).padStart(3, '0')}`,
      siteId: docSiteId,
      sourceImageUrl: URL.createObjectURL(file),
      extractedFields: { name: '(parsed by OCR)', siteId: docSiteId },
      confidence: 0.72,
      reviewStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    documents = [doc, ...documents];
    return { success: true, data: doc };
  },

  confirm: async (
    id: string,
    fields: { fieldName: string; value: string }[]
  ): Promise<ItemResponse<OcrDocument>> => {
    await delay(400);
    const index = documents.findIndex((d) => d.id === id);
    if (index === -1) throw new Error('Document not found');
    const updated: Record<string, unknown> = { ...documents[index].extractedFields };
    fields.forEach((f) => {
      updated[f.fieldName] = f.value;
    });
    const confirmed: OcrDocument = {
      ...documents[index],
      extractedFields: updated,
      reviewStatus: 'confirmed',
    };
    documents[index] = confirmed;
    return { success: true, data: confirmed };
  },
};