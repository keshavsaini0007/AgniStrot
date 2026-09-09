import { mockUsers, delay } from '@/mock/database';
import type { AuthResult, User, LoginCredentials } from '@/types';

export const authMockRepository = {
  login: async (credentials: LoginCredentials): Promise<AuthResult> => {
    await delay(500);
    const user = mockUsers.find((u) => u.email === credentials.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }
    return { token: `mock-jwt.${user.id}`, user };
  },

  register: async (data: {
    name: string;
    email: string;
    password: string;
    role: User['role'];
    siteId?: string | null;
  }): Promise<User> => {
    await delay(500);
    const user: User = {
      id: `usr-${String(mockUsers.length + 1).padStart(3, '0')}`,
      name: data.name,
      email: data.email,
      role: data.role,
      siteId: data.siteId ?? null,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockUsers.push(user);
    return user;
  },
};