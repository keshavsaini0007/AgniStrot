import { inspectionRepository } from '@/repositories';
import type { Inspection, FilterParams, PaginatedResponse } from '@/types';

export const inspectionService = {
  getInspections: async (params?: FilterParams): Promise<PaginatedResponse<Inspection>> => {
    return await inspectionRepository.getInspections(params);
  },

  getInspectionById: async (id: string): Promise<Inspection> => {
    return await inspectionRepository.getInspectionById(id);
  },

  createInspection: async (data: Omit<Inspection, 'id' | 'createdAt' | 'updatedAt'>): Promise<Inspection> => {
    return await inspectionRepository.createInspection(data);
  },

  updateInspection: async (id: string, data: Partial<Inspection>): Promise<Inspection> => {
    return await inspectionRepository.updateInspection(id, data);
  },

  deleteInspection: async (id: string): Promise<void> => {
    await inspectionRepository.deleteInspection(id);
  },
};