import type { Inspection, FilterParams, PaginatedResponse } from '@/types';
import { mockInspections, delay } from '@/mock/database';

let inspections = [...mockInspections];

export const inspectionMockRepository = {
  getInspections: async (params?: FilterParams): Promise<PaginatedResponse<Inspection>> => {
    await delay(400);
    let filtered = [...inspections];
    if (params?.mineId) filtered = filtered.filter((i) => i.mineId === params.mineId);
    if (params?.status) filtered = filtered.filter((i) => i.status === params.status);
    if (params?.type) filtered = filtered.filter((i) => i.type === params.type);
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const start = (page - 1) * limit;
    return {
      success: true,
      data: filtered.slice(start, start + limit),
      meta: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) },
    };
  },
  getInspectionById: async (id: string): Promise<Inspection> => {
    await delay(300);
    const insp = inspections.find((i) => i.id === id);
    if (!insp) throw new Error('Inspection not found');
    return insp;
  },
  createInspection: async (data: Omit<Inspection, 'id' | 'createdAt' | 'updatedAt'>): Promise<Inspection> => {
    await delay(500);
    const newInsp: Inspection = {
      ...data,
      id: `insp-${String(inspections.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inspections.push(newInsp);
    return newInsp;
  },
  updateInspection: async (id: string, data: Partial<Inspection>): Promise<Inspection> => {
    await delay(400);
    const idx = inspections.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Inspection not found');
    inspections[idx] = { ...inspections[idx], ...data, updatedAt: new Date().toISOString() };
    return inspections[idx];
  },
  deleteInspection: async (id: string): Promise<void> => {
    await delay(400);
    inspections = inspections.filter((i) => i.id !== id);
  },
};
