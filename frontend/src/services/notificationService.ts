import { notificationRepository } from '@/repositories';
import type { Notification, FilterParams, PaginatedResponse } from '@/types';

export const notificationService = {
  getNotifications: async (params?: FilterParams): Promise<PaginatedResponse<Notification>> => {
    return await notificationRepository.getNotifications(params);
  },

  markAsRead: async (id: string): Promise<Notification> => {
    return await notificationRepository.markAsRead(id);
  },

  markAllAsRead: async (): Promise<void> => {
    await notificationRepository.markAllAsRead();
  },

  getUnreadCount: async (): Promise<number> => {
    return await notificationRepository.getUnreadCount();
  },
};