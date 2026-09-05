import { Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { formatDate } from '@/utils/date';
import type { User } from '@/types';

const mockUsers: User[] = [
  {
    id: 'usr-001',
    name: 'Rahul Kumar',
    email: 'rahul@coalindia.com',
    role: 'mine_officer',
    department: 'Mining Operations',
    status: 'active',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'usr-002',
    name: 'Priya Sharma',
    email: 'priya@coalindia.com',
    role: 'corporate_management',
    department: 'Corporate Safety',
    status: 'active',
    createdAt: '2026-01-10T09:00:00.000Z',
    updatedAt: '2026-01-10T09:00:00.000Z',
  },
  {
    id: 'usr-003',
    name: 'Amit Singh',
    email: 'amit@coalindia.com',
    role: 'field_inspector',
    department: 'Safety Inspection',
    status: 'active',
    createdAt: '2026-02-01T08:30:00.000Z',
    updatedAt: '2026-02-01T08:30:00.000Z',
  },
  {
    id: 'usr-004',
    name: 'System Admin',
    email: 'admin@coalindia.com',
    role: 'system_admin',
    department: 'IT Administration',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'usr-005',
    name: 'Neha Gupta',
    email: 'neha@coalindia.com',
    role: 'department_officer',
    department: 'Environmental Compliance',
    status: 'active',
    createdAt: '2026-02-15T11:00:00.000Z',
    updatedAt: '2026-02-15T11:00:00.000Z',
  },
];

export const UsersPage = () => {
  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (user: User) => (
        <span className="font-medium text-[#F4F5F5]">{user.name}</span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (user: User) => (
        <span className="text-[#A4ADB2]">{user.email}</span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user: User) => {
        return <Badge status={user.role} />;
      },
    },
    {
      key: 'department',
      header: 'Department',
      render: (user: User) => (
        <span className="text-[#A4ADB2]">{user.department || '-'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user: User) => <Badge status={user.status} />,
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (user: User) => (
        <span className="text-[#A4ADB2]">{formatDate(user.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F4F5F5]">Users</h1>
          <p className="text-[#8D969B]">Manage system users</p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={mockUsers}
          />
        </CardContent>
      </Card>
    </div>
  );
};