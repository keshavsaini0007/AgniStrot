import { mockUsers, delay } from '@/mock/database';
import type { User, LoginCredentials } from '@/types';

let currentUser: User | null = null;

export const authMockRepository = {
  login: async (credentials: LoginCredentials): Promise<{ user: User }> => {
    await delay(500);
    const user = mockUsers.find(u => u.email === credentials.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }
    currentUser = user;
    return { user };
  },

  logout: async (): Promise<void> => {
    await delay(300);
    currentUser = null;
  },

  me: async (): Promise<{ user: User }> => {
    await delay(400);
    if (!currentUser) {
      throw new Error('Not authenticated');
    }
    return { user: currentUser };
  },

  refresh: async (): Promise<{ user: User }> => {
    await delay(300);
    if (!currentUser) {
      throw new Error('Not authenticated');
    }
    return { user: currentUser };
  },
};