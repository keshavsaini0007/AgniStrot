import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/userService';
import { queryKeys } from './useMines';
import type { FilterParams, UpdateUserInput, User } from '@/types';

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

/** Admin user-management mutation (feature 07) — invalidates the directory. */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }): Promise<User> =>
      userService.updateUser(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};