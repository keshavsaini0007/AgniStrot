import { attendanceRepository } from '@/repositories';
import type { Attendance, FilterParams, PaginatedResponse, ItemResponse, AttendanceSyncPayload } from '@/types';

export const attendanceService = {
  getAttendance: async (params?: FilterParams): Promise<PaginatedResponse<Attendance>> => {
    return await attendanceRepository.getAttendance(params);
  },

  syncAttendance: async (records: AttendanceSyncPayload[]): Promise<ItemResponse<Attendance[]>> => {
    return await attendanceRepository.syncAttendance(records);
  },
};