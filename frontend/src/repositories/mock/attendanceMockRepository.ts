import { mockAttendance, delay } from '@/mock/database';
import type { Attendance, FilterParams, PaginatedResponse, AttendanceSyncPayload, ItemResponse } from '@/types';

let attendance = [...mockAttendance];

export const attendanceMockRepository = {
  getAttendance: async (params?: FilterParams): Promise<PaginatedResponse<Attendance>> => {
    await delay(400);
    let filtered = [...attendance];

    if (params?.siteId) {
      filtered = filtered.filter((a) => a.siteId === params.siteId);
    }
    if (params?.status) {
      filtered = filtered.filter((a) => a.checkType === params.status);
    }

    filtered.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));

    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      success: true,
      data: filtered.slice(start, end),
      meta: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    };
  },

  syncAttendance: async (payload: AttendanceSyncPayload[]): Promise<ItemResponse<Attendance[]>> => {
    await delay(500);
    const synced: Attendance[] = payload.map((record, index) => {
      const existing = attendance.find((a) => a.clientUuid === record.clientUuid);
      const recordItem: Attendance = {
        ...record,
        id: existing?.id ?? `att-${String(attendance.length + index + 1).padStart(3, '0')}`,
      };
      attendance = [recordItem, ...attendance.filter((a) => a.clientUuid !== record.clientUuid)];
      return recordItem;
    });
    return { success: true, data: synced };
  },
};