import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { User } from '@/types';

const TOKEN_KEY = 'agnistrot.jwt';
const USER_KEY = 'agnistrot.user';

const isWeb = Platform.OS === 'web';

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore storage failures on web
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore storage failures on web
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const getToken = (): Promise<string | null> => getItem(TOKEN_KEY);

export const getStoredUser = async (): Promise<User | null> => {
  const raw = await getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

export const setAuth = async (token: string, user: User): Promise<void> => {
  await setItem(TOKEN_KEY, token);
  await setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuth = async (): Promise<void> => {
  await deleteItem(TOKEN_KEY);
  await deleteItem(USER_KEY);
};