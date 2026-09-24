import { apiClient } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { FilterParams, PaginatedResponse, UpdateUserInput, User } from '@/types';

interface BackendUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  siteId: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
}

function toUser(u: BackendUserRow): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as User['role'],
    siteId: u.siteId,
    status: u.status,
    createdAt: u.createdAt,
    updatedAt: u.createdAt,
  };
}

function toQueryParams(params?: FilterParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (params?.role) query.role = params.role as string;
  if (params?.status) query.status = params.status as string;
  if (params?.search) query.q = params.search as string;
  return query;
}

/**
 * Real user directory (feature 07 parity) — GET /users + PATCH /users/:id.
 * The backend directory is corporate-only (route guard), so this repository is
 * only ever exercised under a corporate_manager session.
 */
export const userApiRepository = {
  getUsers: async (params?: FilterParams): Promise<PaginatedResponse<User>> => {
    try {
      const res = await apiClient.get<{ data: BackendUserRow[] }>(endpoints.users.list, {
        params: toQueryParams(params),
      });
      const rows = res.data.data ?? [];
      return {
        success: true,
        data: rows.map(toUser),
        meta: {
          page: 1,
          limit: rows.length,
          total: rows.length,
          totalPages: Math.max(1, Math.ceil(rows.length / Math.max(1, rows.length))),
        },
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getUserById: async (id: string): Promise<User> => {
    try {
      const rows = (await userApiRepository.getUsers()).data;
      const user = rows.find((u) => u.id === id);
      if (!user) throw new Error('User not found.');
      return user;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateUser: async (id: string, input: UpdateUserInput): Promise<User> => {
    try {
      const res = await apiClient.patch<BackendUserRow>(endpoints.users.update(id), input);
      return toUser(res.data);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};