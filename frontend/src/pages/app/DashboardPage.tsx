import { motion } from 'framer-motion';
import {
  MapPin,
  Shield,
  AlertTriangle,
  ClipboardCheck,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { useDashboardData } from '@/hooks/useAnalytics';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';

const KPICard = ({
  icon: Icon,
  label,
  value,
  trend,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  trend?: string;
  color: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-[#111416] border border-[#252A2D] rounded-xl p-6"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-[#8D969B] mb-1">{label}</p>
        <p className="text-2xl font-bold text-[#F4F5F5]">{value}</p>
        {trend && (
          <p className="text-xs text-[#35C759] mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </p>
        )}
      </div>
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </motion.div>
);

export const DashboardPage = () => {
  const { data, isLoading, error, refetch } = useDashboardData();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState onRetry={refetch} />;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#F4F5F5]">Dashboard</h1>
        <p className="text-[#8D969B]">Overview of your mining operations</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          icon={MapPin}
          label="Total Mines"
          value={data.kpis.totalMines}
          color="bg-[#D88A32]/10 text-[#D88A32]"
        />
        <KPICard
          icon={Shield}
          label="Compliance Rate"
          value={`${data.kpis.complianceRate}%`}
          trend="+2.1% from last month"
          color="bg-[#35C759]/10 text-[#35C759]"
        />
        <KPICard
          icon={AlertTriangle}
          label="High Risk Mines"
          value={data.kpis.highRiskMines}
          color="bg-[#FF4D4F]/10 text-[#FF4D4F]"
        />
        <KPICard
          icon={ClipboardCheck}
          label="Pending Inspections"
          value={data.kpis.pendingInspections}
          color="bg-[#4DA3FF]/10 text-[#4DA3FF]"
        />
        <KPICard
          icon={Clock}
          label="Overdue Actions"
          value={data.kpis.overdueActions}
          color="bg-[#F5B942]/10 text-[#F5B942]"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Observations */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#F4F5F5]">Recent Observations</h3>
                <Badge status="open" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[#252A2D]">
                {data.recentObservations.slice(0, 5).map((observation) => (
                  <div
                    key={observation.id}
                    className="px-6 py-4 hover:bg-[#171A1D] transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#F4F5F5] truncate">
                          {observation.title}
                        </p>
                        <p className="text-xs text-[#8D969B] mt-1">
                          {observation.category} • {observation.mineId}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge status={observation.severity} />
                        <Badge status={observation.status} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Intelligence */}
        <div>
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-[#F4F5F5]">AI Risk Intelligence</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.riskIntelligence.slice(0, 3).map((risk) => (
                <div
                  key={risk.mineId}
                  className="bg-[#171A1D] rounded-lg p-4 border border-[#252A2D]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#F4F5F5]">
                      Mine {risk.mineId.replace('mine-', '#')}
                    </span>
                    <span
                      className={`text-lg font-bold ${
                        risk.riskLevel === 'high'
                          ? 'text-[#FF4D4F]'
                          : risk.riskLevel === 'medium'
                          ? 'text-[#F5B942]'
                          : 'text-[#35C759]'
                      }`}
                    >
                      {risk.riskScore}
                    </span>
                  </div>
                  <div className="w-full bg-[#252A2D] rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        risk.riskLevel === 'high'
                          ? 'bg-[#FF4D4F]'
                          : risk.riskLevel === 'medium'
                          ? 'bg-[#F5B942]'
                          : 'bg-[#35C759]'
                      }`}
                      style={{ width: `${risk.riskScore}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#8D969B] mt-2">
                    {risk.riskLevel.charAt(0).toUpperCase() + risk.riskLevel.slice(1)} Risk
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Compliance Trend */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-[#F4F5F5]">Compliance Trend</h3>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between h-40">
            {data.complianceTrend.map((point) => (
              <div key={point.date} className="flex flex-col items-center gap-2 flex-1">
                <div className="w-full max-w-[60px] bg-[#D88A32] rounded-t" style={{ height: `${point.value}%` }} />
                <span className="text-xs text-[#8D969B]">
                  {new Date(point.date).toLocaleDateString('en-IN', { month: 'short' })}
                </span>
                <span className="text-xs text-[#A4ADB2]">{point.value}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};