import type { User, FilterParams, PaginatedResponse } from '@/types';
import { mockUsers, delay } from '@/mock/database';

let users = [...mockUsers];

export const userMockRepository = {
  getUsers: async (params?: FilterParams): Promise<PaginatedResponse<User>> => {
    await delay(400);
    let filtered = [...users];
    if (params?.search) {
      const s = params.search.toLowerCase();
      filtered = filtered.filter((u) => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
    }
    if (params?.role) {
      filtered = filtered.filter((u) => u.role === params.role);
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
  getUserById: async (id: string): Promise<User> => {
    await delay(300);
    const user = users.find((u) => u.id === id);
    if (!user) throw new Error('User not found');
    return user;
  },
};
