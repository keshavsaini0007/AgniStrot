import apiClient from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import { unwrap } from '@/api/client';
import type { User, AuthResult, LoginCredentials } from '@/types';

export const authApiRepository = {
  login: async (credentials: LoginCredentials): Promise<AuthResult> => {
    try {
      // Backend → { token, user } (top-level, not wrapped in `data`)
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
      return unwrap<AuthResult>(response.data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  register: async (data: {
    name: string;
    email: string;
    password: string;
    role: User['role'];
    siteId?: string | null;
  }): Promise<User> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, data);
      return unwrap<User>(response.data);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};