import { authRepository } from '@/repositories';
import { getCachedUser } from '@/api/token';
import type { User, AuthResult, LoginCredentials } from '@/types';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResult> => {
    return await authRepository.login(credentials);
  },

  register: async (data: {
    name: string;
    email: string;
    password: string;
    role: User['role'];
    siteId?: string | null;
  }): Promise<User> => {
    return await authRepository.register(data);
  },

  /** Restores the cached session user — the backend has no `/auth/me`. */
  restoreSession: (): User | null => getCachedUser<User>(),
};