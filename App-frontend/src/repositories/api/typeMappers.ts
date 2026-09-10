import type { Inspection } from '@/types';

export interface BackendInspectionList {
  id: string;
  siteId: string;
  type: string;
  inspectorName: string;
  failedCount: number;
  capturedAt: string;
  syncedAt: string;
}

export interface BackendLocation {
  lat?: number;
  lng?: number;
}

export interface BackendInspectionDetail extends BackendInspectionList {
  clientUuid: string;
  checklist: {
    item: string;
    result: 'pass' | 'fail' | 'na';
    notes?: string;
  }[];
  location?: BackendLocation;
  photoUrls: string[];
}

const toAppType = (type: string): Inspection['type'] =>
  type as Inspection['type'];

export function mapInspectionList(b: BackendInspectionList): Inspection {
  return {
    id: b.id,
    mineId: b.siteId,
    inspectorId: b.inspectorName,
    type: toAppType(b.type),
    scheduledAt: b.capturedAt,
    status: 'completed',
    observationsCount: b.failedCount,
    createdAt: b.capturedAt,
    updatedAt: b.syncedAt,
  };
}

export function mapInspectionDetail(b: BackendInspectionDetail): Inspection {
  const mapped = mapInspectionList(b);
  return {
    ...mapped,
    location: b.location && b.location.lat !== undefined && b.location.lng !== undefined
      ? { latitude: b.location.lat, longitude: b.location.lng }
      : undefined,
    notes: b.checklist
      .filter((c) => c.result === 'fail')
      .map((c) => c.item)
      .join('; ') || undefined,
  };
}

export function toSyncLocation(
  location?: { latitude?: number; longitude?: number } | { lat?: number; lng?: number } | null
): { lat: number; lng: number } | undefined {
  if (!location) return undefined;
  const lat = (location as { latitude?: number }).latitude ?? (location as { lat?: number }).lat;
  const lng = (location as { longitude?: number }).longitude ?? (location as { lng?: number }).lng;
  if (lat === undefined || lng === undefined) return undefined;
  return { lat, lng };
}