import { useState } from 'react';
import { FileBarChart, Download, Calendar } from 'lucide-react';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { reportService } from '@/services/reportService';
import { sanitizeErrorMessage } from '@/utils/security';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/layout/PageHeader';
import reportsHeaderImg from '../../../assets/images/Reports.png';
import type { InspectionType } from '@/types';

const inspectionTypes: Array<{ value: InspectionType; label: string }> = [
  { value: 'safety', label: 'Safety' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'production', label: 'Production' },
  { value: 'labour', label: 'Labour' },
];

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const ReportsPage = () => {
  const { data: summary } = useDashboardSummary();
  const sites = summary?.sites ?? [];
  const [siteId, setSiteId] = useState('');
  const [type, setType] = useState<InspectionType | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<{ name: string; date: string } | null>(null);

  const canGenerate = Boolean(siteId && type && from && to);

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setError(null);
    setIsGenerating(true);
    try {
      const blob = await reportService.getStatutoryReport({ siteId, type: type as InspectionType, from, to });
      const filename = `statutory-${siteId}-${type}-${from}-to-${to}.pdf`;
      downloadBlob(blob, filename);
      setGenerated({ name: filename, date: new Date().toLocaleDateString('en-IN') });
    } catch (err: any) {
      setError(sanitizeErrorMessage(err) ?? 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Statutory compliance report export (PDF)"
        backgroundImage={reportsHeaderImg}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-[#F4F5F5]">Generate Statutory Report</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Site"
              placeholder="Select site"
              options={sites.map((site) => ({ value: site.siteId, label: site.name }))}
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
            />
            <Select
              label="Inspection Type"
              options={[{ value: '', label: 'All Types' }, ...inspectionTypes]}
              value={type}
              onChange={(e) => setType(e.target.value as InspectionType)}
            />
            <Input
              label="Start Date"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              leftIcon={<Calendar className="w-4 h-4" />}
            />
            <Input
              label="End Date"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              leftIcon={<Calendar className="w-4 h-4" />}
              min={from || undefined}
            />
            {error && (
              <div className="rounded-lg border border-[#FF4D4F]/30 bg-[#FF4D4F]/10 p-3">
                <p className="text-sm text-[#FF4D4F]">{error}</p>
              </div>
            )}
            <Button
              variant="primary"
              className="w-full"
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              isLoading={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Download Report'} <Download className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-[#F4F5F5]">Recent Reports</h3>
          </CardHeader>
          <CardContent className="p-0">
            {!generated ? (
              <p className="p-6 text-sm text-[#8D969B] italic">
                Generated statutory reports will appear here after download.
              </p>
            ) : (
              <div className="divide-y divide-[#252A2D]">
                <div className="px-6 py-4 hover:bg-[#171A1D] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#D88A32]/10 flex items-center justify-center">
                      <FileBarChart className="w-5 h-5 text-[#D88A32]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#F4F5F5]">{generated.name}</p>
                      <p className="text-xs text-[#8D969B]">{generated.date}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};