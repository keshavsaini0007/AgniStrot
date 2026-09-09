import { reportRepository } from '@/repositories';
import type { StatutoryReportQuery } from '@/types';

export const reportService = {
  /** Downloads the statutory report PDF (backend) or generated blob (mock). */
  getStatutoryReport: async (query: StatutoryReportQuery): Promise<Blob> => {
    return await reportRepository.getStatutoryReport(query);
  },
};