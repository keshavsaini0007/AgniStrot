import { mockUsers, delay } from '@/mock/database';
import type { UpdateUserInput, User, UserListParams } from '@/types';

export const usersMockRepository = {
  list: async (params?: UserListParams): Promise<User[]> => {
    await delay(300);
    let rows = [...mockUsers];
    if (params?.role) rows = rows.filter((u) => u.role === params.role);
    if (params?.status) rows = rows.filter((u) => u.status === params.status);
    return rows;
  },
  /** Mirrors the real PATCH /users/:id semantics for mock mode (feature 07). */
  update: async (id: string, input: UpdateUserInput): Promise<User> => {
    await delay(300);
    const index = mockUsers.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('User not found');
    const current = mockUsers[index];
    const next: User = {
      ...current,
      name: input.name ?? current.name,
      role: input.role ?? current.role,
      siteId: input.siteId !== undefined ? input.siteId : current.siteId,
      status: input.status ?? current.status,
    };
    mockUsers[index] = next;
    return next;
  },
};