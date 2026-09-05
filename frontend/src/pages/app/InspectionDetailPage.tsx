import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, User, FileText } from 'lucide-react';
import { useInspection } from '@/hooks/useInspections';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatDateTime } from '@/utils/date';

export const InspectionDetailPage = () => {
  const { inspectionId } = useParams<{ inspectionId: string }>();
  const { data: inspection, isLoading, error, refetch } = useInspection(inspectionId!);

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

  if (!inspection) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/app/inspections"
          className="p-2 text-[#8D969B] hover:text-[#F4F5F5] hover:bg-[#171A1D] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#F4F5F5]">Inspection {inspection.id}</h1>
            <Badge status={inspection.status} />
          </div>
          <p className="text-[#8D969B] capitalize">{inspection.type} Inspection</p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-[#F4F5F5]">Details</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 py-2 border-b border-[#252A2D]">
              <Calendar className="w-5 h-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Scheduled</p>
                <p className="text-[#F4F5F5]">{formatDateTime(inspection.scheduledAt)}</p>
              </div>
            </div>
            {inspection.startedAt && (
              <div className="flex items-center gap-3 py-2 border-b border-[#252A2D]">
                <Calendar className="w-5 h-5 text-[#8D969B]" />
                <div>
                  <p className="text-sm text-[#8D969B]">Started</p>
                  <p className="text-[#F4F5F5]">{formatDateTime(inspection.startedAt)}</p>
                </div>
              </div>
            )}
            {inspection.completedAt && (
              <div className="flex items-center gap-3 py-2 border-b border-[#252A2D]">
                <Calendar className="w-5 h-5 text-[#8D969B]" />
                <div>
                  <p className="text-sm text-[#8D969B]">Completed</p>
                  <p className="text-[#F4F5F5]">{formatDateTime(inspection.completedAt)}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 py-2 border-b border-[#252A2D]">
              <User className="w-5 h-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Inspector</p>
                <p className="text-[#F4F5F5]">{inspection.inspectorId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-2">
              <MapPin className="w-5 h-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Location</p>
                <p className="text-[#F4F5F5]">{inspection.mineId}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-[#F4F5F5]">Notes</h3>
          </CardHeader>
          <CardContent>
            {inspection.notes ? (
              <p className="text-[#A4ADB2] whitespace-pre-wrap">{inspection.notes}</p>
            ) : (
              <p className="text-[#8D969B] italic">No notes provided</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Observations Count */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-[#F4F5F5]">Observations</h3>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-[#D88A32]" />
            <span className="text-[#A4ADB2]">
              {inspection.observationsCount} observation{inspection.observationsCount !== 1 ? 's' : ''} recorded
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};