import axios from 'axios';
import { getToken, clearAuth } from './tokenStore';

export const defaultApiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: defaultApiBaseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const applyApiUrl = (url?: string | null): void => {
  apiClient.defaults.baseURL = (url && url.trim()) || defaultApiBaseUrl;
};

export const getApiBaseUrl = (): string => apiClient.defaults.baseURL ?? defaultApiBaseUrl;

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export const onUnauthorized = (handler: UnauthorizedHandler): void => {
  unauthorizedHandler = handler;
};

apiClient.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await clearAuth();
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  }
);