import { mockInspections, delay } from '@/mock/database';
import type { Inspection, FilterParams, PaginatedResponse } from '@/types';

let inspections = [...mockInspections];

export const inspectionMockRepository = {
  getInspections: async (params?: FilterParams): Promise<PaginatedResponse<Inspection>> => {
    await delay(400);
    let filteredInspections = [...inspections];
    
    if (params?.mineId) {
      filteredInspections = filteredInspections.filter(inspection => inspection.mineId === params.mineId);
    }

    if (params?.status) {
      filteredInspections = filteredInspections.filter(inspection => inspection.status === params.status);
    }

    if (params?.type) {
      filteredInspections = filteredInspections.filter(inspection => inspection.type === params.type);
    }

    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      success: true,
      data: filteredInspections.slice(start, end),
      meta: {
        page,
        limit,
        total: filteredInspections.length,
        totalPages: Math.ceil(filteredInspections.length / limit),
      },
    };
  },

  getInspectionById: async (id: string): Promise<Inspection> => {
    await delay(300);
    const inspection = inspections.find(i => i.id === id);
    if (!inspection) {
      throw new Error('Inspection not found');
    }
    return inspection;
  },

  createInspection: async (data: Omit<Inspection, 'id' | 'createdAt' | 'updatedAt'>): Promise<Inspection> => {
    await delay(500);
    const newInspection: Inspection = {
      ...data,
      id: `insp-${String(inspections.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inspections.push(newInspection);
    return newInspection;
  },

  updateInspection: async (id: string, data: Partial<Inspection>): Promise<Inspection> => {
    await delay(400);
    const index = inspections.findIndex(i => i.id === id);
    if (index === -1) {
      throw new Error('Inspection not found');
    }
    inspections[index] = { ...inspections[index], ...data, updatedAt: new Date().toISOString() };
    return inspections[index];
  },

  deleteInspection: async (id: string): Promise<void> => {
    await delay(400);
    const index = inspections.findIndex(i => i.id === id);
    if (index === -1) {
      throw new Error('Inspection not found');
    }
    inspections.splice(index, 1);
  },
};