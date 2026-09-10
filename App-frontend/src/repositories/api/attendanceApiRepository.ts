import { apiClient } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import { queueAdd, getPending, removeQueued } from '@/api/offlineQueue';
import { handleApiError } from '@/api/errors';

export interface SyncResult {
  accepted: string[];
  rejected: { clientUuid: string; reason: string }[];
}

export const attendanceApiRepository = {
  queueAttendance: async (record: Record<string, unknown>): Promise<void> => {
    await queueAdd('attendance', record);
  },

  syncPending: async (): Promise<SyncResult> => {
    const pending = await getPending('attendance');
    if (pending.length === 0) return { accepted: [], rejected: [] };

    try {
      const res = await apiClient.post<SyncResult>(endpoints.attendance.sync, {
        records: pending.map((r) => ({ ...r.payload })),
      });
      const { accepted, rejected } = res.data;
      const remove = accepted.concat(
        rejected.filter((r) => r.reason === 'duplicate').map((r) => r.clientUuid)
      );
      await removeQueued('attendance', remove);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  syncAttendance: async (
    records: Record<string, unknown>[]
  ): Promise<SyncResult> => {
    try {
      const res = await apiClient.post<SyncResult>(endpoints.attendance.sync, {
        records,
      });
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};