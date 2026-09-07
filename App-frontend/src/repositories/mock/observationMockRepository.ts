import type { Observation, FilterParams, PaginatedResponse } from '@/types';
import { mockObservations, delay } from '@/mock/database';

let observations = [...mockObservations];

export const observationMockRepository = {
  getObservations: async (params?: FilterParams): Promise<PaginatedResponse<Observation>> => {
    await delay(400);
    let filtered = [...observations];
    if (params?.mineId) filtered = filtered.filter((o) => o.mineId === params.mineId);
    if (params?.status) filtered = filtered.filter((o) => o.status === params.status);
    if (params?.severity) filtered = filtered.filter((o) => o.severity === params.severity);
    if (params?.category) filtered = filtered.filter((o) => o.category === params.category);
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const start = (page - 1) * limit;
    return {
      success: true,
      data: filtered.slice(start, start + limit),
      meta: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) },
    };
  },
  getObservationById: async (id: string): Promise<Observation> => {
    await delay(300);
    const obs = observations.find((o) => o.id === id);
    if (!obs) throw new Error('Observation not found');
    return obs;
  },
  createObservation: async (data: Omit<Observation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Observation> => {
    await delay(500);
    const newObs: Observation = {
      ...data,
      id: `obs-${String(observations.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    observations.push(newObs);
    return newObs;
  },
  updateObservation: async (id: string, data: Partial<Observation>): Promise<Observation> => {
    await delay(400);
    const idx = observations.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error('Observation not found');
    observations[idx] = { ...observations[idx], ...data, updatedAt: new Date().toISOString() };
    return observations[idx];
  },
  deleteObservation: async (id: string): Promise<void> => {
    await delay(400);
    observations = observations.filter((o) => o.id !== id);
  },
};
