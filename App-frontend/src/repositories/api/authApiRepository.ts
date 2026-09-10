import { apiClient } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import { setAuth, getStoredUser, clearAuth } from '@/api/tokenStore';
import { handleApiError } from '@/api/errors';
import type { User, LoginCredentials } from '@/types';

interface BackendLoginUser {
  id: string;
  name: string;
  role: string;
  siteId: string | null;
}

function toAppUser(backend: BackendLoginUser, email?: string): User {
  return {
    id: backend.id,
    name: backend.name,
    role: backend.role as User['role'],
    email: email ?? '',
    department: undefined,
    mineId: backend.siteId ?? undefined,
    status: 'active',
    createdAt: '',
    updatedAt: '',
  };
}

export const authApiRepository = {
  login: async (
    credentials: LoginCredentials
  ): Promise<{ user: User }> => {
    try {
      const res = await apiClient.post<{ token: string; user: BackendLoginUser }>(
        endpoints.auth.login,
        { email: credentials.email, password: credentials.password }
      );
      const { token, user } = res.data;
      const appUser = toAppUser(user, credentials.email);
      await setAuth(token, appUser);
      return { user: appUser };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  logout: async (): Promise<void> => {
    await clearAuth();
  },

  me: async (): Promise<{ user: User }> => {
    const user = await getStoredUser();
    if (!user) throw new Error('Not authenticated');
    return { user };
  },

  refresh: async (): Promise<{ user: User }> => {
    return authApiRepository.me();
  },
};