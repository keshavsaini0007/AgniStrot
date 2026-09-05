import apiClient from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { User, LoginCredentials } from '@/types';

export const authApiRepository = {
  login: async (credentials: LoginCredentials): Promise<{ user: User }> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  me: async (): Promise<{ user: User }> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.AUTH.ME);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  refresh: async (): Promise<{ user: User }> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};