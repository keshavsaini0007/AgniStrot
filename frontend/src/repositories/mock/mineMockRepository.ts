import { mockMines, delay } from '@/mock/database';
import type { Mine, FilterParams, PaginatedResponse } from '@/types';

let mines = [...mockMines];

export const mineMockRepository = {
  getMines: async (params?: FilterParams): Promise<PaginatedResponse<Mine>> => {
    await delay(400);
    let filteredMines = [...mines];
    
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      filteredMines = filteredMines.filter(mine => 
        mine.name.toLowerCase().includes(searchLower) ||
        mine.code.toLowerCase().includes(searchLower)
      );
    }

    if (params?.status) {
      filteredMines = filteredMines.filter(mine => mine.status === params.status);
    }

    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      success: true,
      data: filteredMines.slice(start, end),
      meta: {
        page,
        limit,
        total: filteredMines.length,
        totalPages: Math.ceil(filteredMines.length / limit),
      },
    };
  },

  getMineById: async (id: string): Promise<Mine> => {
    await delay(300);
    const mine = mines.find(m => m.id === id);
    if (!mine) {
      throw new Error('Mine not found');
    }
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
    const index = mines.findIndex(m => m.id === id);
    if (index === -1) {
      throw new Error('Mine not found');
    }
    mines[index] = { ...mines[index], ...data, updatedAt: new Date().toISOString() };
    return mines[index];
  },

  deleteMine: async (id: string): Promise<void> => {
    await delay(400);
    const index = mines.findIndex(m => m.id === id);
    if (index === -1) {
      throw new Error('Mine not found');
    }
    mines.splice(index, 1);
  },
};