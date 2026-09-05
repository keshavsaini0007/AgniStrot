import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useCompliance } from '@/hooks/useCompliance';
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
import type { ComplianceRequirement } from '@/types';

export const CompliancePage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error, refetch } = useCompliance({
    page,
    limit: 10,
    status: statusFilter || undefined,
  });

  const columns = [
    {
      key: 'id',
      header: 'ID',
      render: (comp: ComplianceRequirement) => (
        <span className="font-mono text-[#A4ADB2]">{comp.id}</span>
      ),
    },
    {
      key: 'requirement',
      header: 'Requirement',
      render: (comp: ComplianceRequirement) => (
        <span className="font-medium text-[#F4F5F5]">{comp.requirement}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (comp: ComplianceRequirement) => (
        <span className="text-[#A4ADB2]">{comp.category}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (comp: ComplianceRequirement) => <Badge status={comp.status} />,
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      render: (comp: ComplianceRequirement) => (
        <span className="text-[#A4ADB2]">{formatDate(comp.dueDate)}</span>
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
          <h1 className="text-2xl font-bold text-[#F4F5F5]">Compliance</h1>
          <p className="text-[#8D969B]">Track compliance requirements</p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Requirement
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'compliant', label: 'Compliant' },
                { value: 'non_compliant', label: 'Non-Compliant' },
                { value: 'pending', label: 'Pending' },
                { value: 'overdue', label: 'Overdue' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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
              title="No compliance requirements found"
              description="Try adjusting your filters or add a new requirement."
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={data?.data || []}
                onRowClick={(comp) => navigate(`/app/compliance/${comp.id}`)}
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