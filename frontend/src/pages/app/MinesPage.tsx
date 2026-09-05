import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useMines } from '@/hooks/useMines';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Mine } from '@/types';

export const MinesPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error, refetch } = useMines({
    page,
    limit: 10,
    search,
    status: statusFilter || undefined,
  });

  const columns = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      render: (mine: Mine) => (
        <span className="font-mono text-[#A4ADB2]">{mine.code}</span>
      ),
    },
    {
      key: 'name',
      header: 'Mine Name',
      sortable: true,
      render: (mine: Mine) => (
        <span className="font-medium text-[#F4F5F5]">{mine.name}</span>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (mine: Mine) => (
        <span className="text-[#A4ADB2]">{mine.location.address}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (mine: Mine) => <Badge status={mine.status} />,
    },
    {
      key: 'complianceRate',
      header: 'Compliance',
      sortable: true,
      render: (mine: Mine) => (
        <span className={`font-medium ${mine.complianceRate < 85 ? 'text-[#FF4D4F]' : 'text-[#35C759]'}`}>
          {mine.complianceRate}%
        </span>
      ),
    },
    {
      key: 'riskScore',
      header: 'Risk Score',
      sortable: true,
      render: (mine: Mine) => (
        <span
          className={`font-medium ${
            mine.riskScore >= 70
              ? 'text-[#FF4D4F]'
              : mine.riskScore >= 40
              ? 'text-[#F5B942]'
              : 'text-[#35C759]'
          }`}
        >
          {mine.riskScore}
        </span>
      ),
    },
    {
      key: 'openObservations',
      header: 'Open Issues',
      render: (mine: Mine) => (
        <span className="text-[#A4ADB2]">{mine.openObservations}</span>
      ),
    },
  ];

  if (error) {
    return <ErrorState onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F4F5F5]">Mines</h1>
          <p className="text-[#8D969B]">Manage and monitor all coal mines</p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Mine
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search mines..."
                leftIcon={<Search className="w-4 h-4" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'maintenance', label: 'Maintenance' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={5} columns={7} />
            </div>
          ) : data?.data.length === 0 ? (
            <EmptyState
              title="No mines found"
              description="Try adjusting your search or filters."
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={data?.data || []}
                onRowClick={(mine) => navigate(`/app/mines/${mine.id}`)}
              />
              {data?.meta && (
                <Pagination
                  page={data.meta.page}
                  totalPages={data.meta.totalPages}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};