import { mockUsers, delay } from '@/mock/database';
import type { User } from '@/types';

export const usersMockRepository = {
  list: async (): Promise<User[]> => {
    await delay(300);
    return [...mockUsers];
  },
};