import axios, { type AxiosResponse } from 'axios';
import { env } from '@/config/env';
import { getToken, clearToken } from './token';
import type { PaginatedResponse, Pagination } from '@/types';

const apiClient = axios.create({
  baseURL: env.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// ── Request: attach the bearer token to every call ──────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response: normalize backend envelopes ────────────────────────────────
// Backend controllers return `{ data, pagination? }` (or bare objects for
// actions). Repositories consistently receive `response.data OR a raw object`,
// and a helper `normalizeList()` builds the `{ success, data, meta }` shape
// that the rest of the frontend consumes.
export const normalizeList = <T>(
  body: any,
  fallback: Pagination = { page: 1, limit: 10, total: 0, totalPages: 0 }
): PaginatedResponse<T> => {
  const raw = Array.isArray(body) ? body : body?.data ?? [];
  const pagination: Pagination = body?.pagination ?? body?.meta ?? fallback;
  // Flat pagination (`{ data, total, page, limit }` — used by /documents).
  const page = pagination.page ?? (typeof body?.page === 'number' ? body.page : fallback.page);
  const limit = pagination.limit ?? (typeof body?.limit === 'number' ? body.limit : fallback.limit);
  const total = pagination.total ?? (typeof body?.total === 'number' ? body.total : Array.isArray(raw) ? raw.length : 0);
  return {
    success: true,
    data: (raw ?? []) as T[],
    meta: {
      page,
      limit,
      total,
      totalPages:
        pagination.totalPages ?? (total > 0 && limit > 0 ? Math.ceil(total / limit) : 0),
    },
  };
};

export const unwrap = <T>(body: any, fallback: T | null = null): T => {
  if (body?.data !== undefined) return body.data as T;
  return (body ?? fallback) as T;
};

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;