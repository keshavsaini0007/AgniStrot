import { io, type Socket } from 'socket.io-client';
import { env } from '@/config/env';

let socket: Socket | null = null;

const socketUrl = (): string => {
  const base = env.API_BASE_URL;
  const match = base.match(/^(https?:\/\/[^/]+)/);
  return match ? match[1] : base;
};

export const isSocketEnabled = (): boolean => !env.USE_MOCK_API;

export const connectSocket = (token: string): Socket | null => {
  if (!isSocketEnabled()) return null;
  if (socket) return socket;
  socket = io(socketUrl(), {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  return socket;
};

export const disconnectSocket = (): void => {
  socket?.off();
  socket?.disconnect();
  socket = null;
};

export const getSocket = (): Socket | null => socket;