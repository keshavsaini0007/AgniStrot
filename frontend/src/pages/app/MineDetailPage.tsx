import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Shield, AlertTriangle, Clock, Building2 } from 'lucide-react';
import { useMine } from '@/hooks/useMines';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatDate } from '@/utils/date';

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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/app/mines"
          className="p-2 text-[#8D969B] hover:text-[#F4F5F5] hover:bg-[#171A1D] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#F4F5F5]">{mine.name}</h1>
            <Badge status={mine.status} />
          </div>
          <p className="text-[#8D969B]">{mine.code} • {mine.subsidiary}</p>
        </div>
        <Button variant="secondary">Edit Mine</Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111416] border border-[#252A2D] rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#35C759]/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#35C759]" />
            </div>
            <div>
              <p className="text-sm text-[#8D969B]">Compliance</p>
              <p className="text-xl font-bold text-[#F4F5F5]">{mine.complianceRate}%</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#111416] border border-[#252A2D] rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FF4D4F]/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[#FF4D4F]" />
            </div>
            <div>
              <p className="text-sm text-[#8D969B]">Risk Score</p>
              <p className="text-xl font-bold text-[#F4F5F5]">{mine.riskScore}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#111416] border border-[#252A2D] rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#4DA3FF]/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#4DA3FF]" />
            </div>
            <div>
              <p className="text-sm text-[#8D969B]">Open Issues</p>
              <p className="text-xl font-bold text-[#F4F5F5]">{mine.openObservations}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#111416] border border-[#252A2D] rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F5B942]/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#F5B942]" />
            </div>
            <div>
              <p className="text-sm text-[#8D969B]">Overdue Actions</p>
              <p className="text-xl font-bold text-[#F4F5F5]">{mine.overdueActions}</p>
            </div>
          </div>
        </motion.div>
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