import { mockNotifications, delay } from '@/mock/database';
import type { Notification, FilterParams, PaginatedResponse } from '@/types';

let notifications = [...mockNotifications];

export const notificationMockRepository = {
  getNotifications: async (params?: FilterParams): Promise<PaginatedResponse<Notification>> => {
    await delay(400);
    let filteredNotifications = [...notifications];
    
    if (params?.userId) {
      filteredNotifications = filteredNotifications.filter(notif => notif.userId === params.userId);
    }

    if (params?.read !== undefined) {
      filteredNotifications = filteredNotifications.filter(notif => notif.read === params.read);
    }

    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      success: true,
      data: filteredNotifications.slice(start, end),
      meta: {
        page,
        limit,
        total: filteredNotifications.length,
        totalPages: Math.ceil(filteredNotifications.length / limit),
      },
    };
  },

  markAsRead: async (id: string): Promise<Notification> => {
    await delay(300);
    const index = notifications.findIndex(n => n.id === id);
    if (index === -1) {
      throw new Error('Notification not found');
    }
    notifications[index] = { ...notifications[index], read: true };
    return notifications[index];
  },

  markAllAsRead: async (): Promise<void> => {
    await delay(400);
    notifications = notifications.map(n => ({ ...n, read: true }));
  },

  getUnreadCount: async (): Promise<number> => {
    await delay(200);
    return notifications.filter(n => !n.read).length;
  },
};