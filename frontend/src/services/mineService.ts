import { mineRepository } from '@/repositories';
import type { Mine, FilterParams, PaginatedResponse } from '@/types';

export const mineService = {
  getMines: async (params?: FilterParams): Promise<PaginatedResponse<Mine>> => {
    return await mineRepository.getMines(params);
  },

  getMineById: async (id: string): Promise<Mine> => {
    return await mineRepository.getMineById(id);
  },

  createMine: async (data: Omit<Mine, 'id' | 'createdAt' | 'updatedAt'>): Promise<Mine> => {
    return await mineRepository.createMine(data);
  },

  updateMine: async (id: string, data: Partial<Mine>): Promise<Mine> => {
    return await mineRepository.updateMine(id, data);
  },

  deleteMine: async (id: string): Promise<void> => {
    await mineRepository.deleteMine(id);
  },
};