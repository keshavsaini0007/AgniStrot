import apiClient, { normalizeList } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { UpdateUserInput, User, UserListParams } from '@/types';

export const usersApiRepository = {
  list: async (params?: UserListParams): Promise<User[]> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.USERS.LIST, { params });
      const { data } = normalizeList<User>(response.data);
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  /** Admin user management (feature 07) — PATCH /users/:id. Email is immutable. */
  update: async (id: string, input: UpdateUserInput): Promise<User> => {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.USERS.UPDATE(id), input);
      return response.data as User;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};