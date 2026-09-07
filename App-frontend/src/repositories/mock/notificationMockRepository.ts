import type { Notification, FilterParams, PaginatedResponse } from '@/types';
import { mockNotifications, delay } from '@/mock/database';

let notifications = [...mockNotifications];

export const notificationMockRepository = {
  getNotifications: async (params?: FilterParams): Promise<PaginatedResponse<Notification>> => {
    await delay(400);
    let filtered = [...notifications];
    if (params?.userId) filtered = filtered.filter((n) => n.userId === params.userId);
    if (params?.read !== undefined) filtered = filtered.filter((n) => n.read === params.read);
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const start = (page - 1) * limit;
    return {
      success: true,
      data: filtered.slice(start, start + limit),
      meta: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) },
    };
  },
  markAsRead: async (id: string): Promise<Notification> => {
    await delay(300);
    const idx = notifications.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error('Notification not found');
    notifications[idx] = { ...notifications[idx], read: true };
    return notifications[idx];
  },
  markAllAsRead: async (): Promise<void> => {
    await delay(400);
    notifications = notifications.map((n) => ({ ...n, read: true }));
  },
  getUnreadCount: async (): Promise<number> => {
    await delay(200);
    return notifications.filter((n) => !n.read).length;
  },
};
