import { authRepository } from '@/repositories';
import type { User, LoginCredentials } from '@/types';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<User> => {
    const { user } = await authRepository.login(credentials);
    return user;
  },

  logout: async (): Promise<void> => {
    await authRepository.logout();
  },

  me: async (): Promise<User> => {
    const { user } = await authRepository.me();
    return user;
  },

  refresh: async (): Promise<User> => {
    const { user } = await authRepository.refresh();
    return user;
  },
};