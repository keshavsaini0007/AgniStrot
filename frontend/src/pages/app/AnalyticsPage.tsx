import { useState } from 'react';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { useRiskScore, useTrends, useAiSummary } from '@/hooks/useAi';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { RiskScoreCard } from '@/components/analytics/RiskScoreCard';
import { ComplianceTrendChart } from '@/components/analytics/ComplianceTrendChart';
import { Select } from '@/components/ui/Select';
import { PageHeader } from '@/components/layout/PageHeader';
import { Brain, TrendingUp, Building2 } from 'lucide-react';
import analyticsHeaderImg from '../../../assets/images/AI Risk Intelligence.png';

export const AnalyticsPage = () => {
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useDashboardSummary();

  const sites = summary?.sites ?? [];
  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>(undefined);
  const activeSiteId = selectedSiteId ?? sites[0]?.siteId;

  const { data: risk, isLoading: riskLoading, error: riskError, refetch: refetchRisk } = useRiskScore(activeSiteId);
  const { data: trends, isLoading: trendsLoading, error: trendsError, refetch: refetchTrends } = useTrends(activeSiteId);
  const { data: aiSummary, isLoading: aiLoading } = useAiSummary();

  if (summaryLoading || (riskLoading && activeSiteId)) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Analytics & AI Risk Intelligence"
          subtitle="Rule-based risk scoring per site"
          backgroundImage={analyticsHeaderImg}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (summaryError) {
    return <ErrorState onRetry={refetchSummary} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & AI Risk Intelligence"
        subtitle="Rule-based risk scores and trend lines per site"
        backgroundImage={analyticsHeaderImg}
      />

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#A78BFA]" />
              <h3 className="text-lg font-semibold text-[#F4F5F5]">Scanner Summary</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiLoading ? (
              <CardSkeleton />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[#21415A] bg-[#101D27] p-3">
                  <p className="text-[10px] text-[#8299A7]">Total sites</p>
                  <p className="mt-1 text-xl font-semibold text-[#F4F7F8]">{aiSummary?.totalSites ?? 0}</p>
                </div>
                <div className="rounded-lg border border-[#21415A] bg-[#101D27] p-3">
                  <p className="text-[10px] text-[#8299A7]">High risk</p>
                  <p className="mt-1 text-xl font-semibold text-[#FF4D4F]">{aiSummary?.highRiskSites ?? 0}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#4DA3FF]" />
              <h3 className="text-lg font-semibold text-[#F4F5F5]">Site selection</h3>
            </div>
          </CardHeader>
          <CardContent>
            {sites.length === 0 ? (
              <EmptyState title="No sites available" description="Sites appear once the dashboard summary is available." />
            ) : (
              <Select
                label="Site"
                value={activeSiteId ?? ''}
                onChange={(e) => setSelectedSiteId(e.target.value || undefined)}
                options={sites.map((site) => ({ value: site.siteId, label: site.name }))}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {activeSiteId ? (
        <>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-[#A78BFA]" />
                  <h3 className="text-lg font-semibold text-[#F4F5F5]">Risk Intelligence</h3>
                </div>
              </CardHeader>
              <CardContent>
                {riskError ? (
                  <ErrorState onRetry={refetchRisk} />
                ) : risk ? (
                  <RiskScoreCard siteId={activeSiteId} assessment={risk} />
                ) : null}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#4DA3FF]" />
                  <h3 className="text-lg font-semibold text-[#F4F5F5]">Incident Trend</h3>
                </div>
              </CardHeader>
              <CardContent>
                {trendsError ? (
                  <ErrorState onRetry={refetchTrends} />
                ) : trendsLoading ? (
                  <CardSkeleton />
                ) : (
                  <ComplianceTrendChart
                    data={(trends ?? []).map((point) => ({ date: point.date, value: point.value }))}
                    color="bg-[#4DA3FF]"
                    height="h-48"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent>
            <EmptyState title="Select a site" description="Pick a site above to load its risk intelligence." />
          </CardContent>
        </Card>
      )}
    </div>
  );
};