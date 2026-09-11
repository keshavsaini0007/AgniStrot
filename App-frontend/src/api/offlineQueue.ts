import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export type QueueKind = 'inspection' | 'incident' | 'attendance';

export interface QueuedRecord {
  clientUuid: string;
  queuedAt: string;
  payload: Record<string, unknown>;
}

const keyFor = (kind: QueueKind): string => `agnistrot.queue.${kind}`;

export const newClientUuid = (): string => Crypto.randomUUID();

export const queueAdd = async (
  kind: QueueKind,
  payload: Record<string, unknown>
): Promise<QueuedRecord> => {
  const entry: QueuedRecord = {
    clientUuid: (payload.clientUuid as string) || newClientUuid(),
    queuedAt: new Date().toISOString(),
    payload,
  };
  const raw = await AsyncStorage.getItem(keyFor(kind));
  const current: QueuedRecord[] = raw ? (JSON.parse(raw) as QueuedRecord[]) : [];
  current.push(entry);
  await AsyncStorage.setItem(keyFor(kind), JSON.stringify(current));
  return entry;
};

export const getPending = async (kind: QueueKind): Promise<QueuedRecord[]> => {
  const raw = await AsyncStorage.getItem(keyFor(kind));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedRecord[];
  } catch {
    return [];
  }
};

export const queueCount = async (kind: QueueKind): Promise<number> => {
  const pending = await getPending(kind);
  return pending.length;
};

export const removeQueued = async (
  kind: QueueKind,
  clientUuids: string[]
): Promise<void> => {
  const pending = await getPending(kind);
  const keep = pending.filter((r) => !clientUuids.includes(r.clientUuid));
  await AsyncStorage.setItem(keyFor(kind), JSON.stringify(keep));
};

export const clearQueue = async (kind: QueueKind): Promise<void> => {
  await AsyncStorage.removeItem(keyFor(kind));
};

const lastSyncKeyFor = (kind: QueueKind): string => `agnistrot.lastSync.${kind}`;

export const getLastSyncedAt = async (kind: QueueKind): Promise<string | undefined> => {
  const raw = await AsyncStorage.getItem(lastSyncKeyFor(kind));
  return raw ?? undefined;
};

export const setLastSyncedAt = async (kind: QueueKind, iso: string): Promise<void> => {
  await AsyncStorage.setItem(lastSyncKeyFor(kind), iso);
};

export interface QueueStatusEntry {
  pending: number;
  lastSyncedAt?: string;
}

export type QueueStatus = Record<QueueKind, QueueStatusEntry>;

export const queueKinds: QueueKind[] = ['inspection', 'incident', 'attendance'];

export const queueStatus = async (): Promise<QueueStatus> => {
  const entries = await Promise.all(
    queueKinds.map(async (kind) => {
      const [pending, lastSyncedAt] = await Promise.all([
        queueCount(kind),
        getLastSyncedAt(kind),
      ]);
      return [kind, { pending, lastSyncedAt }] as const;
    })
  );
  return Object.fromEntries(entries) as QueueStatus;
};

export const totalPendingCount = async (): Promise<number> => {
  const status = await queueStatus();
  return queueKinds.reduce((sum, kind) => sum + status[kind].pending, 0);
};