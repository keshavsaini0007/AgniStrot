import { alertRepository } from '@/repositories';
import type { Alert, FilterParams, PaginatedResponse, ItemResponse } from '@/types';

export const alertService = {
  getAlerts: async (params?: FilterParams): Promise<PaginatedResponse<Alert>> => {
    return await alertRepository.getAlerts(params);
  },

  acknowledge: async (id: string, note?: string): Promise<ItemResponse<Alert>> => {
    return await alertRepository.acknowledge(id, note);
  },

  resolve: async (id: string, note?: string): Promise<ItemResponse<Alert>> => {
    return await alertRepository.resolve(id, note);
  },

  escalate: async (id: string, note?: string): Promise<ItemResponse<Alert>> => {
    return await alertRepository.escalate(id, note);
  },
};