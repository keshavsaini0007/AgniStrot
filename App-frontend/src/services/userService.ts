import { userRepository } from '@/repositories';
import type { User, FilterParams, PaginatedResponse, UpdateUserInput } from '@/types';

export const userService = {
  getUsers: async (params?: FilterParams): Promise<PaginatedResponse<User>> => {
    return await userRepository.getUsers(params);
  },
  getUserById: async (id: string): Promise<User> => {
    return await userRepository.getUserById(id);
  },
  updateUser: async (id: string, data: UpdateUserInput): Promise<User> => {
    return await userRepository.updateUser(id, data);
  },
};
