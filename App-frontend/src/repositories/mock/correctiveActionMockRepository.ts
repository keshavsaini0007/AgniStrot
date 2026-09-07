import type { CorrectiveAction, FilterParams, PaginatedResponse } from '@/types';
import { mockCorrectiveActions, delay } from '@/mock/database';

let actions = [...mockCorrectiveActions];

export const correctiveActionMockRepository = {
  getCorrectiveActions: async (params?: FilterParams): Promise<PaginatedResponse<CorrectiveAction>> => {
    await delay(400);
    let filtered = [...actions];
    if (params?.mineId) filtered = filtered.filter((a) => a.mineId === params.mineId);
    if (params?.status) filtered = filtered.filter((a) => a.status === params.status);
    if (params?.priority) filtered = filtered.filter((a) => a.priority === params.priority);
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const start = (page - 1) * limit;
    return {
      success: true,
      data: filtered.slice(start, start + limit),
      meta: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) },
    };
  },
  getCorrectiveActionById: async (id: string): Promise<CorrectiveAction> => {
    await delay(300);
    const action = actions.find((a) => a.id === id);
    if (!action) throw new Error('Corrective action not found');
    return action;
  },
  createCorrectiveAction: async (data: Omit<CorrectiveAction, 'id' | 'createdAt' | 'updatedAt'>): Promise<CorrectiveAction> => {
    await delay(500);
    const newAction: CorrectiveAction = {
      ...data,
      id: `ca-${String(actions.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    actions.push(newAction);
    return newAction;
  },
  updateCorrectiveAction: async (id: string, data: Partial<CorrectiveAction>): Promise<CorrectiveAction> => {
    await delay(400);
    const idx = actions.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Corrective action not found');
    actions[idx] = { ...actions[idx], ...data, updatedAt: new Date().toISOString() };
    return actions[idx];
  },
};
