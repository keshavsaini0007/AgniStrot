import { mockUsers, mockSites, mockAttendance, delay } from '@/mock/database';
import type { AttendanceExportQuery } from '@/types';

// Client-side CSV mirror of the backend export (same quoting rules) so mock
// mode demos the download without a backend.

const csvField = (value: unknown): string => {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCsv = (rows: Array<Array<unknown>>): Blob =>
  new Blob([`\uFEFF${rows.map((r) => r.map(csvField).join(',')).join('\r\n')}\r\n`], {
    type: 'text/csv;charset=utf-8',
  });

// Pretty-printed JSON twin of the CSV register blob (same row keys).
const toJson = (rows: Array<Record<string, unknown>>): Blob =>
  new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json;charset=utf-8' });

export const exportMockRepository = {
  /** Corporate-only register export (mock mode does not enforce RBAC). */
  downloadUsersCsv: async (): Promise<Blob> => {
    await delay(400);
    const rows: Array<Array<unknown>> = [
      ['Name', 'Email', 'Role', 'Site', 'Status', 'Created'],
      ...mockUsers.map((u) => [
        u.name,
        u.email,
        u.role,
        mockSites.find((s) => s.id === u.siteId)?.name ?? '',
        u.status ?? 'active',
        u.createdAt ?? '',
      ]),
    ];
    return toCsv(rows);
  },

  /** Role-scoped attendance export (optional site + date window). */
  downloadAttendanceCsv: async (query?: AttendanceExportQuery): Promise<Blob> => {
    await delay(400);
    let rows = mockAttendance;
    if (query?.siteId) rows = rows.filter((a) => a.siteId === query.siteId);
    if (query?.from) rows = rows.filter((a) => new Date(a.capturedAt) >= new Date(query.from as string));
    if (query?.to) rows = rows.filter((a) => new Date(a.capturedAt) <= new Date(query.to as string));
    const out: Array<Array<unknown>> = [
      ['Site ID', 'Site', 'Worker', 'Check Type', 'Captured At', 'Synced At'],
      ...rows.map((a) => [
        a.siteId,
        mockSites.find((s) => s.id === a.siteId)?.name ?? '',
        a.workerRef,
        a.checkType,
        a.capturedAt,
        a.syncedAt ?? '',
      ]),
    ];
    return toCsv(out);
  },

  /** Corporate JSON register (mock mode does not enforce RBAC). */
  downloadUsersJson: async (): Promise<Blob> => {
    await delay(400);
    const rows = mockUsers.map((u) => ({
      Name: u.name,
      Email: u.email,
      Role: u.role,
      Site: mockSites.find((s) => s.id === u.siteId)?.name ?? '',
      Status: u.status ?? 'active',
      Created: u.createdAt ?? '',
    }));
    return toJson(rows);
  },

  /** Role-scoped attendance JSON export (optional site + date window). */
  downloadAttendanceJson: async (query?: AttendanceExportQuery): Promise<Blob> => {
    await delay(400);
    let rows = mockAttendance;
    if (query?.siteId) rows = rows.filter((a) => a.siteId === query.siteId);
    if (query?.from) rows = rows.filter((a) => new Date(a.capturedAt) >= new Date(query.from as string));
    if (query?.to) rows = rows.filter((a) => new Date(a.capturedAt) <= new Date(query.to as string));
    const out = rows.map((a) => ({
      'Site ID': a.siteId,
      Site: mockSites.find((s) => s.id === a.siteId)?.name ?? '',
      Worker: a.workerRef,
      'Check Type': a.checkType,
      'Captured At': a.capturedAt,
      'Synced At': a.syncedAt ?? '',
    }));
    return toJson(out);
  },
};