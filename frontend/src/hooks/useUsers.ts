import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/services/usersService';
import { queryKeys } from './useMines';
import type { UpdateUserInput, User, UserListParams } from '@/types';

export const useUsers = (params?: UserListParams) => {
  return useQuery({
    queryKey: [...queryKeys.users.all, params],
    queryFn: () => usersService.list(params),
  });
};

/** Admin user-management mutation (feature 07) — invalidates the directory. */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }): Promise<User> =>
      usersService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};