import { observationRepository } from '@/repositories';
import type { Observation, FilterParams, PaginatedResponse } from '@/types';

export const observationService = {
  getObservations: async (params?: FilterParams): Promise<PaginatedResponse<Observation>> => {
    return await observationRepository.getObservations(params);
  },

  getObservationById: async (id: string): Promise<Observation> => {
    return await observationRepository.getObservationById(id);
  },

  createObservation: async (data: Omit<Observation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Observation> => {
    return await observationRepository.createObservation(data);
  },

  updateObservation: async (id: string, data: Partial<Observation>): Promise<Observation> => {
    return await observationRepository.updateObservation(id, data);
  },

  deleteObservation: async (id: string): Promise<void> => {
    await observationRepository.deleteObservation(id);
  },
};