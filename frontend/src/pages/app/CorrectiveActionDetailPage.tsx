import { useParams } from 'react-router-dom';
import { Calendar, MapPin, User, Building2, CheckCircle2, FileText, Flag, ListOrdered } from 'lucide-react';
import { useCorrectiveAction } from '@/hooks/useCorrectiveActions';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { DetailHeader } from '@/components/ui/DetailHeader';
import { formatDateTime, formatDate } from '@/utils/date';

export const CorrectiveActionDetailPage = () => {
  const { actionId } = useParams<{ actionId: string }>();
  const { data: action, isLoading, error, refetch } = useCorrectiveAction(actionId!);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return <ErrorState onRetry={refetch} />;
  }

  if (!action) return null;

  return (
    <div className="space-y-6">
      <DetailHeader
        backTo="/app/corrective-actions"
        title={`Action ${action.id}`}
        subtitle={action.title}
        badges={
          <>
            <Badge status={action.priority} />
            <Badge status={action.status} />
          </>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-[#F4F5F5]">Details</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 border-b border-[#252A2D] py-2">
              <ListOrdered className="h-5 w-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Observation ID</p>
                <p className="text-[#F4F5F5]">{action.observationId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-b border-[#252A2D] py-2">
              <MapPin className="h-5 w-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Mine</p>
                <p className="text-[#F4F5F5]">{action.mineId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-b border-[#252A2D] py-2">
              <User className="h-5 w-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Assigned to</p>
                <p className="text-[#F4F5F5]">{action.assignedTo ?? 'Unassigned'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-b border-[#252A2D] py-2">
              <Building2 className="h-5 w-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Department</p>
                <p className="text-[#F4F5F5]">{action.department ?? '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-b border-[#252A2D] py-2">
              <Flag className="h-5 w-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Priority</p>
                <p className="text-[#F4F5F5]">
                  <Badge status={action.priority} />
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-b border-[#252A2D] py-2">
              <Calendar className="h-5 w-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Due date</p>
                <p className="text-[#F4F5F5]">{formatDate(action.dueDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-b border-[#252A2D] py-2">
              <CheckCircle2 className="h-5 w-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Status</p>
                <p className="text-[#F4F5F5]">
                  <Badge status={action.status} />
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-2">
              <FileText className="h-5 w-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Created</p>
                <p className="text-[#F4F5F5]">{formatDateTime(action.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-[#F4F5F5]">Description</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[#F4F5F5]">{action.description}</p>

            {action.resolutionNote && (
              <div className="rounded-lg border border-[#252A2D] bg-[#0D1722] p-4">
                <p className="text-sm text-[#8D969B]">Resolution note</p>
                <p className="mt-1 text-[#F4F5F5]">{action.resolutionNote}</p>
              </div>
            )}

            <div className="border-t border-[#252A2D] pt-4">
              <p className="text-sm text-[#8D969B]">Last updated</p>
              <p className="mt-1 text-[#F4F5F5]">{formatDateTime(action.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};