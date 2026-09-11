import { apiClient } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import { backendErrorToMessage } from '@/api/adapter';
import { queueAdd, getPending, removeQueued } from '@/api/offlineQueue';
import { handleApiError } from '@/api/errors';
import { toSyncLocation } from './typeMappers';

export interface SyncResult {
  accepted: string[];
  rejected: { clientUuid: string; reason: string }[];
}

export const incidentApiRepository = {
  queueIncident: async (record: Record<string, unknown>): Promise<void> => {
    const safe = {
      ...record,
      location: toSyncLocation(record.location as Record<string, unknown> | null),
    };
    await queueAdd('incident', safe);
  },

  syncPending: async (): Promise<SyncResult> => {
    const pending = await getPending('incident');
    if (pending.length === 0) return { accepted: [], rejected: [] };

    try {
      const res = await apiClient.post<SyncResult>(endpoints.incidents.sync, {
        records: pending.map((r) => ({ ...r.payload })),
      });
      const { accepted, rejected } = res.data;
      const remove = accepted.concat(
        rejected.filter((r) => r.reason === 'duplicate').map((r) => r.clientUuid)
      );
      await removeQueued('incident', remove);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  syncIncidents: async (
    records: Record<string, unknown>[]
  ): Promise<SyncResult> => {
    try {
      const res = await apiClient.post<SyncResult>(endpoints.incidents.sync, {
        records,
      });
      const rejectedReason = res.data.rejected[0]?.reason;
      if (rejectedReason && rejectedReason !== 'duplicate') {
        throw new Error(rejectedReason);
      }
      return res.data;
    } catch (error) {
      if (error instanceof Error && error.message !== 'Network error. Please check your connection.') {
        throw error;
      }
      const message = backendErrorToMessage(
        (error as { response?: { data?: { error?: string } } })?.response?.data ?? {}
      );
      throw new Error(message);
    }
  },
};