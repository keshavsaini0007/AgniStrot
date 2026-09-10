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