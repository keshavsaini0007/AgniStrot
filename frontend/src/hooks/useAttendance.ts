import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '@/services/attendanceService';
import { queryKeys } from './useMines';
import type { FilterParams } from '@/types';

export const useAttendance = (params?: FilterParams) => {
  return useQuery({
    queryKey: [...queryKeys.attendance.all, params],
    queryFn: () => attendanceService.getAttendance(params),
  });
};