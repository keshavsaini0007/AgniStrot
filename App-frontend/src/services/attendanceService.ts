import { attendanceRepository } from '@/repositories';

export const attendanceService = {
  queueAttendance: async (record: Record<string, unknown>): Promise<void> => {
    return await attendanceRepository.queueAttendance(record);
  },
};
