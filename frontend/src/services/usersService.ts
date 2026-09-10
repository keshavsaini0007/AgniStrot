import { usersRepository } from '@/repositories';
import type { User } from '@/types';

export const usersService = {
  list: async (): Promise<User[]> => {
    return await usersRepository.list();
  },
};