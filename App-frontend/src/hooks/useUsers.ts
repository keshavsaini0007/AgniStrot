import { useQuery } from '@tanstack/react-query';
import { userService } from '@/services/userService';
import { queryKeys } from './useMines';
import type { FilterParams } from '@/types';

export const useUsers = (params?: FilterParams) => {
  return useQuery({
    queryKey: [...queryKeys.users.all, params],
    queryFn: () => userService.getUsers(params),
  });
};

export const useUser = (id: string) => {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => userService.getUserById(id),
  });
};
