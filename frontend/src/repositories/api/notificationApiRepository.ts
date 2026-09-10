import apiClient, { normalizeList } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { FilterParams, Notification, PaginatedResponse } from '@/types';
import { alertApiRepository } from './alertApiRepository';

/**
 * Notifications = the live Alert feed (aliased for the legacy nav entry).
 * An "unread" notification is an open alert; marking it read acknowledges it
 * through the real workflow. The legacy Notification.shape is preserved so the
 * existing inbox UI works unchanged against real backend data.
 */
type AlertLike = {
  id: string;
  ruleCode: string;
  siteName: string;
  sourceType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'escalated' | 'closed';
  createdAt: string;
};

const titleCase = (s: string): string =>
  s
    .replace(/_+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

function toNotification(a: AlertLike): Notification {
  const severity: Notification['severity'] =
    a.severity === 'critical' ? 'high' : a.severity;
  const type: Notification['type'] =
    severity === 'high' ? 'error' : severity === 'medium' ? 'warning' : 'info';
  return {
    id: a.id,
    userId: '',
    type,
    title: `${titleCase(a.ruleCode)} — ${a.siteName}`,
    message: `${a.sourceType} alert detected at ${a.siteName}.`,
    severity,
    entityType: a.sourceType,
    entityId: a.id,
    read: a.status !== 'open',
    createdAt: a.createdAt,
  };
}

export const notificationApiRepository = {
  getNotifications: async (params?: FilterParams): Promise<PaginatedResponse<Notification>> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ALERTS.BASE, {
        params: {
          siteId: params?.siteId || undefined,
          // "Unread" maps to the open/working alert set; acknowledged+ are "read".
          status: params?.read === false ? 'open' : undefined,
          limit: params?.limit || 20,
        },
      });
      const alerts = normalizeList<AlertLike>(response.data);
      return { ...alerts, data: alerts.data.map(toNotification) };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  markAsRead: async (id: string): Promise<Notification> => {
    try {
      await alertApiRepository.acknowledge(id);
      return {
        id,
        userId: '',
        type: 'info',
        title: 'Acknowledged',
        message: 'Alert acknowledged.',
        severity: 'low',
        entityType: 'alert',
        entityId: id,
        read: true,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  markAllAsRead: async (): Promise<void> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ALERTS.BASE, {
        params: { status: 'open', limit: 50 },
      });
      const alerts = normalizeList<AlertLike>(response.data);
      await Promise.all(alerts.data.map((a) => alertApiRepository.acknowledge(a.id)));
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getUnreadCount: async (): Promise<number> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ALERTS.BASE, {
        params: { status: 'open', limit: 1 },
      });
      return normalizeList<AlertLike>(response.data).meta.total;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};