import { mockObservations, delay } from '@/mock/database';
import type { Observation, FilterParams, PaginatedResponse } from '@/types';

let observations = [...mockObservations];

export const observationMockRepository = {
  getObservations: async (params?: FilterParams): Promise<PaginatedResponse<Observation>> => {
    await delay(400);
    let filteredObservations = [...observations];
    
    if (params?.mineId) {
      filteredObservations = filteredObservations.filter(obs => obs.mineId === params.mineId);
    }

    if (params?.inspectionId) {
      filteredObservations = filteredObservations.filter(obs => obs.inspectionId === params.inspectionId);
    }

    if (params?.severity) {
      filteredObservations = filteredObservations.filter(obs => obs.severity === params.severity);
    }

    if (params?.status) {
      filteredObservations = filteredObservations.filter(obs => obs.status === params.status);
    }

    if (params?.category) {
      filteredObservations = filteredObservations.filter(obs => obs.category === params.category);
    }

    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      success: true,
      data: filteredObservations.slice(start, end),
      meta: {
        page,
        limit,
        total: filteredObservations.length,
        totalPages: Math.ceil(filteredObservations.length / limit),
      },
    };
  },

  getObservationById: async (id: string): Promise<Observation> => {
    await delay(300);
    const observation = observations.find(o => o.id === id);
    if (!observation) {
      throw new Error('Observation not found');
    }
    return observation;
  },

  createObservation: async (data: Omit<Observation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Observation> => {
    await delay(500);
    const newObservation: Observation = {
      ...data,
      id: `obs-${String(observations.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    observations.push(newObservation);
    return newObservation;
  },

  updateObservation: async (id: string, data: Partial<Observation>): Promise<Observation> => {
    await delay(400);
    const index = observations.findIndex(o => o.id === id);
    if (index === -1) {
      throw new Error('Observation not found');
    }
    observations[index] = { ...observations[index], ...data, updatedAt: new Date().toISOString() };
    return observations[index];
  },

  deleteObservation: async (id: string): Promise<void> => {
    await delay(400);
    const index = observations.findIndex(o => o.id === id);
    if (index === -1) {
      throw new Error('Observation not found');
    }
    observations.splice(index, 1);
  },
};