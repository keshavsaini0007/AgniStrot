import { queueStatus, totalPendingCount, setLastSyncedAt, type QueueKind } from '@/api/offlineQueue';
import {
  inspectionApiRepository,
  incidentApiRepository,
  attendanceApiRepository,
} from '@/repositories';
import type { SyncResult as IncidentSyncResult } from '@/repositories/api/incidentApiRepository';

export type SyncResult = IncidentSyncResult;

export interface SyncOutcome {
  kind: QueueKind;
  result: SyncResult;
}

export interface SyncSummary {
  synced: SyncOutcome[];
  failed: QueueKind[];
  accepted: number;
  rejected: number;
}

const flushKinds: { kind: QueueKind; sync: () => Promise<SyncResult> }[] = [
  { kind: 'inspection', sync: inspectionApiRepository.syncPending },
  { kind: 'incident', sync: incidentApiRepository.syncPending },
  { kind: 'attendance', sync: attendanceApiRepository.syncPending },
];

const flushQueuedKinds = async (): Promise<SyncSummary> => {
  const settled = await Promise.allSettled(
    flushKinds.map(async ({ kind, sync }) => {
      const result = await sync();
      await setLastSyncedAt(kind, new Date().toISOString());
      return { kind, result } as SyncOutcome;
    })
  );

  const synced: SyncOutcome[] = [];
  const failed: QueueKind[] = [];
  settled.forEach((entry, index) => {
    if (entry.status === 'fulfilled') synced.push(entry.value);
    else failed.push(flushKinds[index].kind);
  });

  const accepted = synced.reduce((sum, o) => sum + o.result.accepted.length, 0);
  const rejected = synced.reduce((sum, o) => sum + o.result.rejected.length, 0);
  return { synced, failed, accepted, rejected };
};

export const syncService = {
  queueStatus,
  totalPendingCount,
  syncNow: flushQueuedKinds,
};