import { mockIncidents, mockInspections, mockAttendance, delay } from '@/mock/database';
import type { StatutoryReportQuery } from '@/types';

/** Demo "report" is a real text/PDF blob generated from mock data on the client. */
export const reportMockRepository = {
  getStatutoryReport: async (query: StatutoryReportQuery): Promise<Blob> => {
    await delay(800);
    const incidents = mockIncidents.filter((i) => i.siteId === query.siteId);
    const inspections = mockInspections.filter((i) => i.siteId === query.siteId);
    const attendance = mockAttendance.filter((a) => a.siteId === query.siteId);
    const from = query.from;
    const to = query.to;

    const lines = [
      `AGNISTROT STATUTORY COMPLIANCE REPORT`,
      `Site: ${query.siteId}`,
      `Period: ${from} to ${to}`,
      `Generated: ${new Date().toISOString()}`,
      '',
      `INCIDENTS:`,
      ...incidents.map((i) => `- [${i.severity}] ${i.category}: ${i.description} (${i.capturedAt})`),
      '',
      `INSPECTIONS (checklist failures):`,
      ...inspections.map(
        (i) => `- ${i.type} ${i.capturedAt}: ${i.failedCount} FAILED of ${i.checklist.length} items`
      ),
      '',
      `ATTENDANCE RECORDS: ${attendance.length}`,
      '',
      `END OF REPORT`,
    ];

    return new Blob([lines.join('\n')], { type: 'text/plain' });
  },
};