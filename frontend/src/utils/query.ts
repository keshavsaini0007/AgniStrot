import type { FilterParams } from '@/types';

export const buildQueryParams = (params: FilterParams): Record<string, string> => {
  const queryParams: Record<string, string> = {};

  if (params.page) queryParams.page = String(params.page);
  if (params.limit) queryParams.limit = String(params.limit);
  if (params.search) queryParams.search = params.search;
  if (params.sortBy) queryParams.sortBy = params.sortBy;
  if (params.sortOrder) queryParams.sortOrder = params.sortOrder;

  // Add other filter parameters
  Object.entries(params).forEach(([key, value]) => {
    if (!['page', 'limit', 'search', 'sortBy', 'sortOrder'].includes(key) && value !== undefined && value !== null && value !== '') {
      queryParams[key] = String(value);
    }
  });

  return queryParams;
};

export const parseQueryString = (queryString: string): FilterParams => {
  const params = new URLSearchParams(queryString);
  const filterParams: FilterParams = {};

  params.forEach((value, key) => {
    if (key === 'page' || key === 'limit') {
      filterParams[key] = Number(value);
    } else {
      filterParams[key] = value;
    }
  });

  return filterParams;
};