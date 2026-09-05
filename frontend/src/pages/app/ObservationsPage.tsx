import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useObservations } from '@/hooks/useObservations';
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
import type { Observation } from '@/types';

export const ObservationsPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error, refetch } = useObservations({
    page,
    limit: 10,
    severity: severityFilter || undefined,
    status: statusFilter || undefined,
  });

  const columns = [
    {
      key: 'id',
      header: 'ID',
      render: (obs: Observation) => (
        <span className="font-mono text-[#A4ADB2]">{obs.id}</span>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      render: (obs: Observation) => (
        <span className="font-medium text-[#F4F5F5]">{obs.title}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (obs: Observation) => (
        <span className="capitalize text-[#A4ADB2]">{obs.category}</span>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (obs: Observation) => <Badge status={obs.severity} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (obs: Observation) => <Badge status={obs.status} />,
    },
    {
      key: 'createdAt',
      header: 'Reported',
      sortable: true,
      render: (obs: Observation) => (
        <span className="text-[#A4ADB2]">{formatDate(obs.createdAt)}</span>
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
          <h1 className="text-2xl font-bold text-[#F4F5F5]">Observations</h1>
          <p className="text-[#8D969B]">Track and manage safety observations</p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Observation
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select
              options={[
                { value: '', label: 'All Severities' },
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'critical', label: 'Critical' },
              ]}
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            />
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'open', label: 'Open' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'closed', label: 'Closed' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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
              title="No observations found"
              description="Try adjusting your filters or create a new observation."
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={data?.data || []}
                onRowClick={(obs) => navigate(`/app/observations/${obs.id}`)}
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