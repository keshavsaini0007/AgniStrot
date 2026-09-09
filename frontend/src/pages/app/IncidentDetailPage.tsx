import { useParams } from 'react-router-dom';
import { Calendar, MapPin, User, FileText, ShieldAlert, Eye, Wrench, CircleEllipsis } from 'lucide-react';
import { useIncident } from '@/hooks/useIncidents';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { DetailHeader } from '@/components/ui/DetailHeader';
import { formatDateTime } from '@/utils/date';
import type { IncidentCategory } from '@/types';
import type { LucideIcon } from 'lucide-react';

const categoryTone: Record<IncidentCategory, { icon: LucideIcon; color: string }> = {
  safety: { icon: ShieldAlert, color: 'text-[#FF4D4F]' },
  environmental: { icon: Eye, color: 'text-[#35C759]' },
  equipment: { icon: Wrench, color: 'text-[#4DA3FF]' },
  other: { icon: CircleEllipsis, color: 'text-[#A78BFA]' },
};

export const IncidentDetailPage = () => {
  const { incidentId } = useParams<{ incidentId: string }>();
  const { data: incident, isLoading, error, refetch } = useIncident(incidentId!);

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

  if (!incident) return null;

  const tone = categoryTone[incident.category] ?? categoryTone.other;
  const CatIcon = tone.icon;

  return (
    <div className="space-y-6">
      <DetailHeader
        backTo="/app/incidents"
        title={`Incident ${incident.id}`}
        subtitle={incident.category}
        badges={
          <>
            <span className="flex items-center gap-1.5 rounded-md bg-[#D88A32]/10 px-2 py-1 text-xs capitalize text-[#D88A32]">
              <CatIcon className="h-3.5 w-3.5" /> {incident.category}
            </span>
            <Badge status={incident.severity} />
            <Badge status={incident.status.replace('_', '-')} />
          </>
        }
      />

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-[#F4F5F5]">Details</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 py-2 border-b border-[#252A2D]">
              <Calendar className="w-5 h-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Captured at</p>
                <p className="text-[#F4F5F5]">{formatDateTime(incident.capturedAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-2 border-b border-[#252A2D]">
              <MapPin className="w-5 h-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Site</p>
                <p className="text-[#F4F5F5]">{incident.siteId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-2 border-b border-[#252A2D]">
              <User className="w-5 h-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Reported by</p>
                <p className="text-[#F4F5F5]">{incident.reportedBy}</p>
              </div>
            </div>
            {incident.syncedAt && (
              <div className="flex items-center gap-3 py-2 border-b border-[#252A2D]">
                <FileText className="w-5 h-5 text-[#8D969B]" />
                <div>
                  <p className="text-sm text-[#8D969B]">Synced at</p>
                  <p className="text-[#F4F5F5]">{formatDateTime(incident.syncedAt)}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 py-2">
              <CatIcon className={`h-5 w-5 shrink-0 ${tone.color}`} />
              <div>
                <p className="text-sm text-[#8D969B]">Category</p>
                <p className="text-[#F4F5F5] capitalize">{incident.category}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-[#F4F5F5]">Description</h3>
          </CardHeader>
          <CardContent>
            <p className="text-[#A4ADB2] whitespace-pre-wrap leading-relaxed">{incident.description}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};