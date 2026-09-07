import type { ComplianceRequirement, FilterParams, PaginatedResponse } from '@/types';
import { mockCompliance, delay } from '@/mock/database';

let compliance = [...mockCompliance];

export const complianceMockRepository = {
  getCompliance: async (params?: FilterParams): Promise<PaginatedResponse<ComplianceRequirement>> => {
    await delay(400);
    let filtered = [...compliance];
    if (params?.mineId) filtered = filtered.filter((c) => c.mineId === params.mineId);
    if (params?.status) filtered = filtered.filter((c) => c.status === params.status);
    if (params?.category) filtered = filtered.filter((c) => c.category === params.category);
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const start = (page - 1) * limit;
    return {
      success: true,
      data: filtered.slice(start, start + limit),
      meta: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) },
    };
  },
  getComplianceById: async (id: string): Promise<ComplianceRequirement> => {
    await delay(300);
    const item = compliance.find((c) => c.id === id);
    if (!item) throw new Error('Compliance not found');
    return item;
  },
  createCompliance: async (data: Omit<ComplianceRequirement, 'id' | 'createdAt' | 'updatedAt'>): Promise<ComplianceRequirement> => {
    await delay(500);
    const newItem: ComplianceRequirement = {
      ...data,
      id: `comp-${String(compliance.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    compliance.push(newItem);
    return newItem;
  },
  updateCompliance: async (id: string, data: Partial<ComplianceRequirement>): Promise<ComplianceRequirement> => {
    await delay(400);
    const idx = compliance.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Compliance not found');
    compliance[idx] = { ...compliance[idx], ...data, updatedAt: new Date().toISOString() };
    return compliance[idx];
  },
};
