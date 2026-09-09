import apiClient, { normalizeList, unwrap } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { Attendance, FilterParams, PaginatedResponse, ItemResponse, AttendanceSyncPayload } from '@/types';

export const attendanceApiRepository = {
  getAttendance: async (params?: FilterParams): Promise<PaginatedResponse<Attendance>> => {
    try {
      // Backend accepts checkType (in/out) and workerRef; `search` → workerRef.
      const response = await apiClient.get(API_ENDPOINTS.ATTENDANCE.BASE, {
        params: {
          siteId: params?.siteId || undefined,
          checkType: (params?.checkType ?? params?.status) || undefined,
          workerRef: params?.search || undefined,
          page: params?.page,
          limit: params?.limit,
        },
      });
      return normalizeList<Attendance>(response.data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  syncAttendance: async (payload: AttendanceSyncPayload[]): Promise<ItemResponse<Attendance[]>> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.ATTENDANCE.SYNC, { records: payload });
      return { success: true, data: unwrap<Attendance[]>(response.data, []) };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};