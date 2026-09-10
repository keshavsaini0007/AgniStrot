import apiClient, { normalizeList } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { User } from '@/types';

export const usersApiRepository = {
  list: async (): Promise<User[]> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.USERS.LIST);
      const { data } = normalizeList<User>(response.data);
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};