import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useInspections } from '@/hooks/useInspections';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/utils/date';
import type { Inspection } from '@/types';

export const InspectionsPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data, isLoading, error, refetch } = useInspections({
    page,
    limit: 10,
    status: statusFilter || undefined,
    type: typeFilter || undefined,
  });

  const columns = [
    {
      key: 'id',
      header: 'ID',
      render: (inspection: Inspection) => (
        <span className="font-mono text-[#A4ADB2]">{inspection.id}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (inspection: Inspection) => (
        <span className="capitalize text-[#F4F5F5]">{inspection.type}</span>
      ),
    },
    {
      key: 'mineId',
      header: 'Mine',
      render: (inspection: Inspection) => (
        <span className="text-[#A4ADB2]">{inspection.mineId}</span>
      ),
    },
    {
      key: 'scheduledAt',
      header: 'Scheduled',
      sortable: true,
      render: (inspection: Inspection) => (
        <span className="text-[#A4ADB2]">{formatDate(inspection.scheduledAt)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (inspection: Inspection) => <Badge status={inspection.status} />,
    },
    {
      key: 'observationsCount',
      header: 'Observations',
      render: (inspection: Inspection) => (
        <span className="text-[#A4ADB2]">{inspection.observationsCount}</span>
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
          <h1 className="text-2xl font-bold text-[#F4F5F5]">Inspections</h1>
          <p className="text-[#8D969B]">Manage and track mine inspections</p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Inspection
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
            <Select
              options={[
                { value: '', label: 'All Types' },
                { value: 'safety', label: 'Safety' },
                { value: 'environmental', label: 'Environmental' },
                { value: 'operational', label: 'Operational' },
                { value: 'statutory', label: 'Statutory' },
              ]}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={5} columns={6} />
            </div>
          ) : data?.data.length === 0 ? (
            <EmptyState
              title="No inspections found"
              description="Try adjusting your filters or create a new inspection."
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={data?.data || []}
                onRowClick={(inspection) => navigate(`/app/inspections/${inspection.id}`)}
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