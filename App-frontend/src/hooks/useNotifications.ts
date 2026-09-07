import { useQuery } from '@tanstack/react-query';
import { notificationService } from '@/services/notificationService';
import { queryKeys } from './useMines';
import type { FilterParams } from '@/types';

export const useNotifications = (params?: FilterParams) => {
  return useQuery({
    queryKey: [...queryKeys.notifications.all, params],
    queryFn: () => notificationService.getNotifications(params),
  });
};

export const useUnreadNotificationCount = () => {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: () => notificationService.getUnreadCount(),
  });
};
