import { motion } from 'framer-motion';
import { Brain, TrendingUp, Shield } from 'lucide-react';
import { useDashboardData, useRiskAnalytics, useComplianceAnalytics } from '@/hooks/useAnalytics';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';

export const AnalyticsPage = () => {
  const { isLoading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useDashboardData();
  const { data: riskData, isLoading: riskLoading, error: riskError, refetch: refetchRisk } = useRiskAnalytics();
  const { data: complianceData, isLoading: complianceLoading, error: complianceError, refetch: refetchCompliance } = useComplianceAnalytics();

  if (dashboardLoading || riskLoading || complianceLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (dashboardError || riskError || complianceError) {
    return <ErrorState onRetry={() => { refetchDashboard(); refetchRisk(); refetchCompliance(); }} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F4F5F5]">Analytics & AI Risk Intelligence</h1>
        <p className="text-[#8D969B]">Insights and risk assessments across all operations</p>
      </div>

      {/* Risk Intelligence */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#A78BFA]" />
            <h3 className="text-lg font-semibold text-[#F4F5F5]">AI Risk Intelligence</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {riskData?.slice(0, 3).map((risk) => (
              <motion.div
                key={risk.mineId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#171A1D] border border-[#252A2D] rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-[#F4F5F5]">
                    Mine {risk.mineId.replace('mine-', '#')}
                  </span>
                  <span
                    className={`text-2xl font-bold ${
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
                <div className="w-full bg-[#252A2D] rounded-full h-2 mb-3">
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
                <div className="space-y-2">
                  {risk.factors.map((factor, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-[#8D969B]">{factor.label}</span>
                      <span className="text-[#A4ADB2]">{factor.score}%</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#8D969B] mt-3">{risk.explanation}</p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Analytics */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#35C759]" />
              <h3 className="text-lg font-semibold text-[#F4F5F5]">Compliance Overview</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <p className="text-4xl font-bold text-[#35C759]">{complianceData?.overall}%</p>
              <p className="text-sm text-[#8D969B]">Overall Compliance</p>
            </div>
            <div className="space-y-3">
              {complianceData?.byCategory.map((cat: { category: string; rate: number }) => (
                <div key={cat.category} className="flex items-center justify-between">
                  <span className="text-sm text-[#A4ADB2]">{cat.category}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-[#252A2D] rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-[#35C759]"
                        style={{ width: `${cat.rate}%` }}
                      />
                    </div>
                    <span className="text-sm text-[#A4ADB2]">{cat.rate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#4DA3FF]" />
              <h3 className="text-lg font-semibold text-[#F4F5F5]">Compliance Trend</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between h-48">
              {complianceData?.trend.map((point: { date: string; value: number }) => (
                <div key={point.date} className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-full max-w-[60px] bg-[#4DA3FF] rounded-t" style={{ height: `${point.value}%` }} />
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
    </div>
  );
};