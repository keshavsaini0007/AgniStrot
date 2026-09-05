import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useCorrectiveActions } from '@/hooks/useCorrectiveActions';
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
import type { CorrectiveAction } from '@/types';

export const CorrectiveActionsPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const { data, isLoading, error, refetch } = useCorrectiveActions({
    page,
    limit: 10,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
  });

  const columns = [
    {
      key: 'id',
      header: 'ID',
      render: (action: CorrectiveAction) => (
        <span className="font-mono text-[#A4ADB2]">{action.id}</span>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      render: (action: CorrectiveAction) => (
        <span className="font-medium text-[#F4F5F5]">{action.title}</span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (action: CorrectiveAction) => <Badge status={action.priority} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (action: CorrectiveAction) => <Badge status={action.status} />,
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      render: (action: CorrectiveAction) => (
        <span className="text-[#A4ADB2]">{formatDate(action.dueDate)}</span>
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
          <h1 className="text-2xl font-bold text-[#F4F5F5]">Corrective Actions</h1>
          <p className="text-[#8D969B]">Track and manage corrective actions</p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Action
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'reported', label: 'Reported' },
                { value: 'assigned', label: 'Assigned' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'verified', label: 'Verified' },
                { value: 'closed', label: 'Closed' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
            <Select
              options={[
                { value: '', label: 'All Priorities' },
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={5} columns={5} />
            </div>
          ) : data?.data.length === 0 ? (
            <EmptyState
              title="No corrective actions found"
              description="Try adjusting your filters or create a new action."
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={data?.data || []}
                onRowClick={(action) => navigate(`/app/corrective-actions/${action.id}`)}
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