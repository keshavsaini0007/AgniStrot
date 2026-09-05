import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });
};

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });
};