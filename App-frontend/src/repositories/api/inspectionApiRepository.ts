import { apiClient } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import { toPaginated, backendErrorToMessage } from '@/api/adapter';
import { queueAdd, getPending, removeQueued } from '@/api/offlineQueue';
import { handleApiError } from '@/api/errors';
import type { Inspection, FilterParams, PaginatedResponse } from '@/types';
import {
  mapInspectionList,
  mapInspectionDetail,
  toSyncLocation,
  type BackendInspectionList,
  type BackendInspectionDetail,
} from './typeMappers';

interface SyncResult {
  accepted: string[];
  rejected: { clientUuid: string; reason: string }[];
}

function toQueryParams(params?: FilterParams): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  if (params?.page) query.page = params.page;
  if (params?.limit) query.limit = params.limit;
  if (params?.mineId) query.siteId = params.mineId as string;
  if (params?.type) query.type = params.type as string;
  if (params?.from) query.from = params.from as string;
  if (params?.to) query.to = params.to as string;
  return query;
}

export const inspectionApiRepository = {
  getInspections: async (
    params?: FilterParams
  ): Promise<PaginatedResponse<Inspection>> => {
    try {
      const res = await apiClient.get<{ data: BackendInspectionList[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
        endpoints.inspections.list,
        { params: toQueryParams(params) }
      );
      return toPaginated(
        res.data.data.map(mapInspectionList),
        res.data.pagination
      );
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getInspectionById: async (id: string): Promise<Inspection> => {
    try {
      const res = await apiClient.get<{ data: BackendInspectionDetail }>(
        endpoints.inspections.detail(id)
      );
      return mapInspectionDetail(res.data.data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  createInspection: async (
    data: Omit<Inspection, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Inspection> => {
    const siteId = (data as { mineId?: string }).mineId ?? (data as { siteId?: string }).siteId;
    if (!siteId) throw new Error('siteId is required to sync an inspection.');

    const checklist = (data as { checklist?: unknown }).checklist ?? [
      { item: 'Recorded via mobile capture', result: 'pass' },
    ];

    const record = {
      clientUuid: (data as { clientUuid?: string }).clientUuid,
      siteId,
      type: data.type,
      checklist,
      location: toSyncLocation(data.location),
      photoUrls: (data as { photoUrls?: string[] }).photoUrls ?? [],
      capturedAt: data.scheduledAt || new Date().toISOString(),
    };

    await queueAdd('inspection', record);
    return data as unknown as Inspection;
  },

  updateInspection: async (): Promise<Inspection> => {
    throw new Error('Updating inspections is not supported by the backend.');
  },

  deleteInspection: async (): Promise<void> => {
    throw new Error('Deleting inspections is not supported by the backend.');
  },

  syncPending: async (): Promise<SyncResult> => {
    const pending = await getPending('inspection');
    if (pending.length === 0) return { accepted: [], rejected: [] };

    try {
      const res = await apiClient.post<SyncResult>(
        endpoints.inspections.sync,
        { records: pending.map((r) => ({ ...r.payload })) }
      );
      const { accepted, rejected } = res.data;
      const remove = accepted.concat(
        rejected.filter((r) => r.reason === 'duplicate').map((r) => r.clientUuid)
      );
      await removeQueued('inspection', remove);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  syncInspection: async (record: Record<string, unknown>): Promise<SyncResult> => {
    try {
      const res = await apiClient.post<SyncResult>(endpoints.inspections.sync, {
        records: [record],
      });
      if (res.data.rejected[0]?.reason !== 'duplicate') {
        const serverReason = res.data.rejected[0]?.reason;
        if (serverReason) throw new Error(serverReason);
      }
      return res.data;
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : backendErrorToMessage((error as { response?: { data?: { error?: string } } })?.response?.data ?? {});
      throw new Error(message);
    }
  },
};