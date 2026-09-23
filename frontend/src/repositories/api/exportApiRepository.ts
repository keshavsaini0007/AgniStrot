import apiClient from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { AttendanceExportQuery } from '@/types';

export const exportApiRepository = {
  /**
   * Corporate-only — full user register as a CSV blob.
   * Backend sets Content-Disposition: attachment; filename="users-register.csv".
   */
  downloadUsersCsv: async (): Promise<Blob> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.EXPORTS.USERS_CSV, {
        responseType: 'blob',
      });
      return response.data as Blob;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Role-scoped attendance register as a CSV blob. Site-linked roles
   * (mine_official / field_officer) are pinned to their own site server-side;
   * corporate / regulator may pass optional siteId + from/to filters.
   */
  downloadAttendanceCsv: async (query?: AttendanceExportQuery): Promise<Blob> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.EXPORTS.ATTENDANCE_CSV, {
        params: query,
        responseType: 'blob',
      });
      return response.data as Blob;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};