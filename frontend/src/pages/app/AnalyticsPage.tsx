import { useDashboardData, useRiskAnalytics, useComplianceAnalytics } from '@/hooks/useAnalytics';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { RiskScoreCard } from '@/components/analytics/RiskScoreCard';
import { ComplianceOverview } from '@/components/compliance/ComplianceOverview';
import { ComplianceTrendChart } from '@/components/analytics/ComplianceTrendChart';
import { PageHeader } from '@/components/layout/PageHeader';
import { Brain, TrendingUp, Shield } from 'lucide-react';
import analyticsHeaderImg from '../../../assets/images/AI Risk Intelligence.png';

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
      <PageHeader
        title="Analytics & AI Risk Intelligence"
        subtitle="Insights and risk assessments across all operations"
        backgroundImage={analyticsHeaderImg}
      />

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
              <RiskScoreCard
                key={risk.mineId}
                mineId={risk.mineId}
                riskScore={risk.riskScore}
                riskLevel={risk.riskLevel}
                factors={risk.factors}
                explanation={risk.explanation}
              />
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
            <ComplianceOverview
              overall={complianceData?.overall || 0}
              byCategory={complianceData?.byCategory || []}
            />
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
            <ComplianceTrendChart
              data={complianceData?.trend || []}
              color="bg-[#4DA3FF]"
              height="h-48"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
