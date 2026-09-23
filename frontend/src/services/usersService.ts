import { usersRepository } from '@/repositories';
import type { UpdateUserInput, User, UserListParams } from '@/types';

export const usersService = {
  list: async (params?: UserListParams): Promise<User[]> => {
    return await usersRepository.list(params);
  },
  /** Admin user management (feature 07). */
  update: async (id: string, input: UpdateUserInput): Promise<User> => {
    return await usersRepository.update(id, input);
  },
};