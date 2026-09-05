import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { formatDate } from '@/utils/date';
import type { AuditLog } from '@/types';

const mockAuditLogs: AuditLog[] = [
  {
    id: 'audit-001',
    userId: 'usr-003',
    action: 'CREATE',
    entityType: 'observation',
    entityId: 'obs-001',
    details: { title: 'Damaged Safety Barricade', severity: 'high' },
    ipAddress: '192.168.1.100',
    createdAt: '2026-08-28T15:00:00.000Z',
  },
  {
    id: 'audit-002',
    userId: 'usr-001',
    action: 'UPDATE',
    entityType: 'corrective_action',
    entityId: 'ca-002',
    details: { status: 'in_progress', previousStatus: 'assigned' },
    ipAddress: '192.168.1.101',
    createdAt: '2026-09-01T14:00:00.000Z',
  },
  {
    id: 'audit-003',
    userId: 'usr-004',
    action: 'CREATE',
    entityType: 'user',
    entityId: 'usr-005',
    details: { name: 'Neha Gupta', role: 'department_officer' },
    ipAddress: '192.168.1.102',
    createdAt: '2026-02-15T11:00:00.000Z',
  },
  {
    id: 'audit-004',
    userId: 'usr-003',
    action: 'UPDATE',
    entityType: 'observation',
    entityId: 'obs-003',
    details: { status: 'resolved', previousStatus: 'in_progress' },
    ipAddress: '192.168.1.100',
    createdAt: '2026-08-26T14:00:00.000Z',
  },
  {
    id: 'audit-005',
    userId: 'usr-001',
    action: 'LOGIN',
    entityType: 'auth',
    entityId: 'usr-001',
    details: { email: 'rahul@coalindia.com' },
    ipAddress: '192.168.1.101',
    createdAt: '2026-09-02T08:00:00.000Z',
  },
];

export const AuditLogsPage = () => {
  const columns = [
    {
      key: 'id',
      header: 'ID',
      render: (log: AuditLog) => (
        <span className="font-mono text-[#A4ADB2]">{log.id}</span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (log: AuditLog) => (
        <Badge status={log.action.toLowerCase()} />
      ),
    },
    {
      key: 'entityType',
      header: 'Entity Type',
      render: (log: AuditLog) => (
        <span className="capitalize text-[#A4ADB2]">{log.entityType.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'userId',
      header: 'User',
      render: (log: AuditLog) => (
        <span className="text-[#A4ADB2]">{log.userId}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Timestamp',
      sortable: true,
      render: (log: AuditLog) => (
        <span className="text-[#A4ADB2]">{formatDate(log.createdAt)}</span>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      render: (log: AuditLog) => (
        <span className="text-[#8D969B] font-mono">{log.ipAddress}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F4F5F5]">Audit Logs</h1>
        <p className="text-[#8D969B]">System activity audit trail</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={mockAuditLogs}
          />
        </CardContent>
      </Card>
    </div>
  );
};