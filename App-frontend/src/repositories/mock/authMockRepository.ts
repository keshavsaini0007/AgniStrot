import type { User, LoginCredentials } from '@/types';
import { mockUsers, delay } from '@/mock/database';

const MINE_OFFICER = mockUsers.find((u) => u.role === 'mine_officer') || mockUsers[0];

let currentUser: User | null = null;

export const authMockRepository = {
  login: async (credentials: LoginCredentials): Promise<{ user: User }> => {
    await delay(500);
    const user = mockUsers.find(
      (u) => u.email === credentials.email && u.role === 'mine_officer'
    );
    if (!user) throw new Error('Only mine officer accounts are allowed');
    currentUser = user;
    return { user };
  },
  logout: async (): Promise<void> => {
    await delay(300);
    currentUser = null;
  },
  me: async (): Promise<{ user: User }> => {
    await delay(300);
    currentUser = MINE_OFFICER;
    return { user: MINE_OFFICER };
  },
  refresh: async (): Promise<{ user: User }> => {
    await delay(300);
    currentUser = MINE_OFFICER;
    return { user: MINE_OFFICER };
  },
};