import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { connectSocket, disconnectSocket, isSocketEnabled } from '@/api/socket';
import { getToken } from '@/api/token';
import { queryKeys } from './useMines';

export const useAlertSocket = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isSocketEnabled() || !user) return;
    const token = getToken();
    if (!token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    const onAlertEvent = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    };

    socket.on('alert:new', onAlertEvent);
    socket.on('alert:escalated', onAlertEvent);

    return () => {
      socket.off('alert:new', onAlertEvent);
      socket.off('alert:escalated', onAlertEvent);
      disconnectSocket();
    };
  }, [user, queryClient]);
};