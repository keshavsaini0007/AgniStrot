import type { PaginatedResponse } from '@/types';

export interface BackendPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BackendErrorResponse {
  error?: string;
  details?: Array<{ field: string; message: string }>;
}

export function toPaginated<T>(
  data: T[],
  pagination: BackendPagination
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
    },
  };
}

export function backendErrorToMessage(error: BackendErrorResponse): string {
  if (error?.error) return error.error;
  const first = error?.details?.[0];
  if (first) return first.message;
  return 'Something went wrong.';
}