import { exportRepository } from '@/repositories';
import type { AttendanceExportQuery } from '@/types';

export const exportService = {
  /** Downloads the corporate user register CSV (backend or mock blob). */
  downloadUsersCsv: async (): Promise<Blob> => {
    return await exportRepository.downloadUsersCsv();
  },

  /** Downloads the role-scoped attendance register CSV. */
  downloadAttendanceCsv: async (query?: AttendanceExportQuery): Promise<Blob> => {
    return await exportRepository.downloadAttendanceCsv(query);
  },

  /** Downloads the corporate user register JSON. */
  downloadUsersJson: async (): Promise<Blob> => {
    return await exportRepository.downloadUsersJson();
  },

  /** Downloads the role-scoped attendance register JSON. */
  downloadAttendanceJson: async (query?: AttendanceExportQuery): Promise<Blob> => {
    return await exportRepository.downloadAttendanceJson(query);
  },
};