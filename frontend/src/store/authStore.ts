import { create } from 'zustand';
import { authService } from '@/services/authService';
import { setToken, setCachedUser, clearSession } from '@/api/token';
import type { User, LoginCredentials } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (credentials: LoginCredentials) => {
    try {
      const { token, user } = await authService.login(credentials);
      setToken(token);
      setCachedUser(user);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Login failed', isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    clearSession();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  fetchCurrentUser: async () => {
    // No `/auth/me` on the backend — restore the persisted token + user.
    const user = authService.restoreSession();
    if (user) {
      set({ user, isAuthenticated: true, isLoading: false });
    } else {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));