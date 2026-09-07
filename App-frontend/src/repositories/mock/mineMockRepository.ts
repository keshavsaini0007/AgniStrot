import type { Mine, FilterParams, PaginatedResponse } from '@/types';
import { mockMines, delay } from '@/mock/database';

let mines = [...mockMines];

export const mineMockRepository = {
  getMines: async (params?: FilterParams): Promise<PaginatedResponse<Mine>> => {
    await delay(400);
    let filtered = [...mines];
    if (params?.search) {
      const s = params.search.toLowerCase();
      filtered = filtered.filter((m) => m.name.toLowerCase().includes(s) || m.code.toLowerCase().includes(s));
    }
    if (params?.status) {
      filtered = filtered.filter((m) => m.status === params.status);
    }
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const start = (page - 1) * limit;
    return {
      success: true,
      data: filtered.slice(start, start + limit),
      meta: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) },
    };
  },
  getMineById: async (id: string): Promise<Mine> => {
    await delay(300);
    const mine = mines.find((m) => m.id === id);
    if (!mine) throw new Error('Mine not found');
    return mine;
  },
  createMine: async (data: Omit<Mine, 'id' | 'createdAt' | 'updatedAt'>): Promise<Mine> => {
    await delay(500);
    const newMine: Mine = {
      ...data,
      id: `mine-${String(mines.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mines.push(newMine);
    return newMine;
  },
  updateMine: async (id: string, data: Partial<Mine>): Promise<Mine> => {
    await delay(400);
    const idx = mines.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error('Mine not found');
    mines[idx] = { ...mines[idx], ...data, updatedAt: new Date().toISOString() };
    return mines[idx];
  },
  deleteMine: async (id: string): Promise<void> => {
    await delay(400);
    mines = mines.filter((m) => m.id !== id);
  },
};
