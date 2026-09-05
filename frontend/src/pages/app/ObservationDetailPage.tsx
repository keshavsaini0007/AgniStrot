import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, User, Calendar, FileText, AlertTriangle } from 'lucide-react';
import { useObservation } from '@/hooks/useObservations';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatDateTime } from '@/utils/date';

export const ObservationDetailPage = () => {
  const { observationId } = useParams<{ observationId: string }>();
  const { data: observation, isLoading, error, refetch } = useObservation(observationId!);

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

  if (!observation) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/app/observations"
          className="p-2 text-[#8D969B] hover:text-[#F4F5F5] hover:bg-[#171A1D] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#F4F5F5]">{observation.title}</h1>
            <Badge status={observation.severity} />
            <Badge status={observation.status} />
          </div>
          <p className="text-[#8D969B]">{observation.id} • {observation.category}</p>
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
              <User className="w-5 h-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Reported By</p>
                <p className="text-[#F4F5F5]">{observation.reportedBy}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-2 border-b border-[#252A2D]">
              <Calendar className="w-5 h-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Created</p>
                <p className="text-[#F4F5F5]">{formatDateTime(observation.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-2 border-b border-[#252A2D]">
              <MapPin className="w-5 h-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Location</p>
                <p className="text-[#F4F5F5]">{observation.mineId}</p>
              </div>
            </div>
            {observation.assignedDepartment && (
              <div className="flex items-center gap-3 py-2">
                <AlertTriangle className="w-5 h-5 text-[#8D969B]" />
                <div>
                  <p className="text-sm text-[#8D969B]">Assigned Department</p>
                  <p className="text-[#F4F5F5]">{observation.assignedDepartment}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-[#F4F5F5]">Description</h3>
          </CardHeader>
          <CardContent>
            <p className="text-[#A4ADB2] whitespace-pre-wrap">{observation.description}</p>
          </CardContent>
        </Card>
      </div>

      {/* Evidence */}
      {observation.evidence.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-[#F4F5F5]">Evidence</h3>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {observation.evidence.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-[#171A1D] border border-[#252A2D] rounded-lg px-3 py-2"
                >
                  <FileText className="w-4 h-4 text-[#8D969B]" />
                  <span className="text-sm text-[#A4ADB2]">{file}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};