import apiClient from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { Mine, FilterParams, PaginatedResponse } from '@/types';

export const mineApiRepository = {
  getMines: async (params?: FilterParams): Promise<PaginatedResponse<Mine>> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.MINES.BASE, { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getMineById: async (id: string): Promise<Mine> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.MINES.BY_ID(id));
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  createMine: async (data: Omit<Mine, 'id' | 'createdAt' | 'updatedAt'>): Promise<Mine> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.MINES.BASE, data);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateMine: async (id: string, data: Partial<Mine>): Promise<Mine> => {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.MINES.BY_ID(id), data);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  deleteMine: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(API_ENDPOINTS.MINES.BY_ID(id));
    } catch (error) {
      throw handleApiError(error);
    }
  },
};