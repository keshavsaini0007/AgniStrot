import { useParams } from 'react-router-dom';
import { MapPin, Shield, AlertTriangle, Clock, Building2 } from 'lucide-react';
import { useMine } from '@/hooks/useMines';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { StatCard } from '@/components/mines/StatCard';
import { DetailHeader } from '@/components/ui/DetailHeader';
import { formatDate } from '@/utils/date';
import complianceRateImg from '../../../assets/images/Compliance Rate.png';
import highRiskMinesImg from '../../../assets/images/High Risk Mines-clean.png';
import inspectionsHeaderImg from '../../../assets/images/Inspections Header.png';
import mine002Img from '@/assets/images/Mine-002-clean.png';

export const MineDetailPage = () => {
  const { mineId } = useParams<{ mineId: string }>();
  const { data: mine, isLoading, error, refetch } = useMine(mineId!);

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

  if (!mine) return null;

  return (
    <div className="space-y-6">
      <DetailHeader
        backTo="/app/mines"
        title={mine.name}
        subtitle={`${mine.code} • ${mine.subsidiary}`}
        badges={<Badge status={mine.status} />}
        action={<Button variant="secondary">Edit Mine</Button>}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Shield}
          label="Compliance"
          value={`${mine.complianceRate}%`}
          color="bg-[#35C759]/10 text-[#35C759]"
          backgroundImage={complianceRateImg}
        />
        <StatCard
          icon={AlertTriangle}
          label="Risk Score"
          value={mine.riskScore}
          color="bg-[#FF4D4F]/10 text-[#FF4D4F]"
          backgroundImage={highRiskMinesImg}
          delay={0.1}
        />
        <StatCard
          icon={Building2}
          label="Open Issues"
          value={mine.openObservations}
          color="bg-[#4DA3FF]/10 text-[#4DA3FF]"
          backgroundImage={inspectionsHeaderImg}
          delay={0.2}
        />
        <StatCard
          icon={Clock}
          label="Overdue Actions"
          value={mine.overdueActions}
          color="bg-[#F5B942]/10 text-[#F5B942]"
          backgroundImage={mine002Img}
          delay={0.3}
        />
      </div>

      {/* Location */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-[#F4F5F5]">Location</h3>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[#D88A32] mt-0.5" />
            <div>
              <p className="text-[#F4F5F5]">{mine.location.address}</p>
              <p className="text-sm text-[#8D969B] mt-1">
                Lat: {mine.location.latitude}, Lng: {mine.location.longitude}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-[#F4F5F5]">Activity</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-[#252A2D]">
            <span className="text-[#A4ADB2]">Last Inspection</span>
            <span className="text-[#F4F5F5]">
              {mine.lastInspectionAt ? formatDate(mine.lastInspectionAt) : 'Never'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#252A2D]">
            <span className="text-[#A4ADB2]">Created</span>
            <span className="text-[#F4F5F5]">{formatDate(mine.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[#A4ADB2]">Last Updated</span>
            <span className="text-[#F4F5F5]">{formatDate(mine.updatedAt)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
