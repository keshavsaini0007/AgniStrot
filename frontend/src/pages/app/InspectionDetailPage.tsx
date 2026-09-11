import { useParams } from 'react-router-dom';
import { Calendar, MapPin, User, FileText, CheckCircle2, XCircle, MinusCircle, Shield, Leaf, Wrench, Users, ImageOff } from 'lucide-react';
import { useInspection } from '@/hooks/useInspections';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { DetailHeader } from '@/components/ui/DetailHeader';
import { formatDateTime } from '@/utils/date';
import type { InspectionType, ChecklistResult } from '@/types';
import type { LucideIcon } from 'lucide-react';

const typeTone: Record<InspectionType, { icon: LucideIcon; color: string }> = {
  safety: { icon: Shield, color: 'text-[#D88A32]' },
  environmental: { icon: Leaf, color: 'text-[#35C759]' },
  production: { icon: Wrench, color: 'text-[#4DA3FF]' },
  labour: { icon: Users, color: 'text-[#A78BFA]' },
};

const resultBadge: Record<ChecklistResult, { label: string; status: string; icon: LucideIcon }> = {
  pass: { label: 'Pass', status: 'active', icon: CheckCircle2 },
  fail: { label: 'Fail', status: 'high', icon: XCircle },
  na: { label: 'N/A', status: 'info', icon: MinusCircle },
};

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

  const tone = typeTone[inspection.type] ?? typeTone.safety;
  const TypeIcon = tone.icon;
  const failures = inspection.checklist.filter((c) => c.result === 'fail').length;

  return (
    <div className="space-y-6">
      <DetailHeader
        backTo="/app/inspections"
        title={`Inspection ${inspection.id}`}
        subtitle={`${inspection.type} inspection`}
        badges={
          <>
            <span className="flex items-center gap-1.5 rounded-md bg-[#D88A32]/10 px-2 py-1 text-xs capitalize text-[#D88A32]">
              <TypeIcon className="h-3.5 w-3.5" /> {inspection.type}
            </span>
            <Badge status={failures > 0 ? 'high' : 'active'} />
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
                <p className="text-[#F4F5F5]">{formatDateTime(inspection.capturedAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-2 border-b border-[#252A2D]">
              <MapPin className="w-5 h-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Site</p>
                <p className="text-[#F4F5F5]">{inspection.siteId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-2 border-b border-[#252A2D]">
              <User className="w-5 h-5 text-[#8D969B]" />
              <div>
                <p className="text-sm text-[#8D969B]">Inspector</p>
                <p className="text-[#F4F5F5]">{inspection.inspectorId}</p>
              </div>
            </div>
            {inspection.syncedAt && (
              <div className="flex items-center gap-3 py-2 border-b border-[#252A2D]">
                <FileText className="w-5 h-5 text-[#8D969B]" />
                <div>
                  <p className="text-sm text-[#8D969B]">Synced at</p>
                  <p className="text-[#F4F5F5]">{formatDateTime(inspection.syncedAt)}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 py-2">
              <CheckCircle2 className="w-5 h-5 text-[#35C759]" />
              <div>
                <p className="text-sm text-[#8D969B]">Checklist result</p>
                <p className="text-[#F4F5F5]">
                  {inspection.checklist.length - failures} passed · {failures} failed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-[#F4F5F5]">Checklist</h3>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-[#252A2D]">
            {inspection.checklist.length === 0 && (
              <p className="p-4 text-sm text-[#8D969B] italic">No checklist items recorded.</p>
            )}
            {inspection.checklist.map((item, index) => {
              const badge = resultBadge[item.result];
              const Icon = badge.icon;
              return (
                <div key={index} className="flex items-start gap-3 px-4 py-3">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${item.result === 'fail' ? 'text-[#FF4D4F]' : item.result === 'pass' ? 'text-[#35C759]' : 'text-[#A4ADB2]'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#F4F5F5]">{item.item}</p>
                    {item.notes && <p className="mt-1 text-xs text-[#F5B942]">{item.notes}</p>}
                  </div>
                  <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-[#A4ADB2]">
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-[#F4F5F5]">Inspection photo</h3>
        </CardHeader>
        <CardContent>
          {inspection.photoUrls.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {inspection.photoUrls.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Inspection photo ${index + 1}`}
                  className="h-48 w-full rounded-lg border border-[#252A2D] object-cover"
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <ImageOff className="h-8 w-8 text-[#8D969B]" />
              <p className="mt-3 text-sm font-medium text-[#F4F5F5]">No image uploaded</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};