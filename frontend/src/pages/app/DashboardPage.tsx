import { useDashboardData } from '@/hooks/useAnalytics';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { ComplianceTrendChart } from '@/components/analytics/ComplianceTrendChart';
import { ArrowUpRight, BarChart3, ChevronRight, CircleAlert, ClipboardCheck, Clock3, MapPin, ShieldCheck, Sparkles } from 'lucide-react';

import pendingInspectionsImg from '@/assets/images/Pending Inspections-clean.png';
import overdueActionsImg from '@/assets/images/Overdue Actions-clean.png';
import aiRiskIntelligenceImg from '@/assets/images/AI Risk Intelligence-clean.png';
import mine001Img from '@/assets/images/Mine-001-clean.png';
import mine002Img from '@/assets/images/Mine-002-clean.png';
import mine003Img from '@/assets/images/Mine-003-clean.png';
import damagedBarricadeImg from '@/assets/images/Damaged Safety Barricade-clean.png';
import structuralWeaknessImg from '@/assets/images/Structural Weakness in Support Beam-clean.png';
import waterRunoffImg from '@/assets/images/Minor Water Runoff Issue-clean.png';
import dustEmissionImg from '@/assets/images/Dust Emission Near Processing Plant-clean.png';
import equipmentMaintenanceImg from '@/assets/images/Equipment Maintenance Overdue-clean.png';
import totalMinesImg from '../../../assets/images/Total Mines.png';
import complianceRateImg from '../../../assets/images/Compliance Rate.png';
import dashboardImg from '../../../assets/images/Dashboard.png';

const observationImages: Record<string, string> = {
  'Damaged Safety Barricade': damagedBarricadeImg,
  'Structural Weakness in Support Beam': structuralWeaknessImg,
  'Minor Water Runoff Issue': waterRunoffImg,
  'Dust Emission Near Processing Plant': dustEmissionImg,
  'Equipment Maintenance Overdue': equipmentMaintenanceImg,
};

const mineImages: Record<string, string> = {
  'mine-001': mine001Img,
  'mine-002': mine002Img,
  'mine-003': mine003Img,
};

const kpiVisuals = {
  totalMines: { label: 'Total Mines', icon: MapPin, color: 'text-[#4DA3FF]', image: totalMinesImg },
  complianceRate: { label: 'Compliance Rate', icon: ShieldCheck, color: 'text-[#35C759]', image: complianceRateImg },
  highRiskMines: { label: 'High Risk Mines', icon: CircleAlert, color: 'text-[#FF4D5F]', image: dashboardImg },
  pendingInspections: { label: 'Pending Inspections', icon: ClipboardCheck, color: 'text-[#4DA3FF]', image: pendingInspectionsImg },
  overdueActions: { label: 'Overdue Actions', icon: Clock3, color: 'text-[#F5B942]', image: overdueActionsImg },
};

const riskTone = (level: string) => ({
  critical: { bar: 'bg-[#FF4058]', text: 'text-[#FF4058]', label: 'Critical risk' },
  high: { bar: 'bg-[#FF4058]', text: 'text-[#FF4058]', label: 'High risk' },
  medium: { bar: 'bg-[#F5B942]', text: 'text-[#F5B942]', label: 'Medium risk' },
  low: { bar: 'bg-[#35C759]', text: 'text-[#35C759]', label: 'Low risk' },
}[level] ?? { bar: 'bg-[#4DA3FF]', text: 'text-[#4DA3FF]', label: 'Review' });

export const DashboardPage = () => {
  const { data, isLoading, error, refetch } = useDashboardData();

  if (isLoading) {
    return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <CardSkeleton key={index} />)}</div>;
  }

  if (error) return <ErrorState onRetry={refetch} />;
  if (!data) return null;

  const kpis = [
    { ...kpiVisuals.totalMines, value: data.kpis.totalMines, note: 'Active across operations' },
    { ...kpiVisuals.complianceRate, value: `${data.kpis.complianceRate}%`, note: '+2.1% from last month' },
    { ...kpiVisuals.highRiskMines, value: data.kpis.highRiskMines, note: 'Requires attention' },
    { ...kpiVisuals.pendingInspections, value: data.kpis.pendingInspections, note: 'Awaiting field review' },
    { ...kpiVisuals.overdueActions, value: data.kpis.overdueActions, note: 'Past due date' },
  ];

  return (
    <div className="space-y-5 pb-8">
      <section className="relative isolate overflow-hidden rounded-2xl border border-[#25445B] bg-[#07121C] px-5 py-6 sm:px-8 sm:py-8">
        <img src={mine001Img} alt="Open-pit mine operations at night" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#07121C_5%,rgba(7,18,28,0.20)_42%,rgba(7,18,28,0.3)_100%)]" />
        <div className="relative max-w-2xl">
          <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-[#5DB8FF]">Operations control / live overview</p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#F4F7F8] sm:text-4xl">Dashboard</h1>
          <p className="mt-2 max-w-md text-sm text-[#B3C5D0]">Overview of mining operations, field observations and emerging risk signals.</p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-[#B3C5D0]"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#35C759] shadow-[0_0_10px_#35C759]" />System live</span><span className="text-[#557486]">Last synced just now</span></div>
        </div>
      </section>

      <section aria-label="Key operational metrics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map(({ label, value, note, icon: Icon, color, image }) => <article key={label} className="group relative isolate min-h-[116px] overflow-hidden rounded-xl border border-[#21415A] bg-[#0C1A27] p-4"><img src={image} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-100 transition-opacity duration-300 group-hover:opacity-40" /><div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0C1A27] via-[#0C1A27]/90 to-transparent" /><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] text-[#A5BAC7]">{label}</p><p className="mt-1 text-2xl font-semibold text-[#F4F7F8]">{value}</p><p className={`mt-1 text-[9px] ${label === 'Compliance Rate' ? 'text-[#35C759]' : 'text-[#91A9B7]'}`}>{note}</p></div><span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-[#07121C]/80 ${color}`}><Icon className="h-4 w-4" /></span></div></article>)}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.8fr)]">
        <Card className="overflow-hidden border-[#21415A] bg-[#0a172245]">
          <div className="flex items-center justify-between border-b border-[#21415A] px-4 py-4 sm:px-5"><div><h2 className="text-base font-semibold text-[#F4F7F8]">Recent Observations</h2><p className="mt-1 text-[10px] text-[#8299A7]">Latest safety and environmental signals from the field</p></div><button className="hidden items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-[#5DB8FF] sm:flex">View all <ArrowUpRight className="h-3.5 w-3.5" /></button></div>
          <CardContent className="relative overflow-hidden p-0">
            <div className="absolute inset-0 bg-[#0a172245]/85 backdrop-blur-sm" /><div className="relative divide-y divide-[#1E3545]" >{data.recentObservations.slice(0, 5).map((observation) => <div key={observation.id} className="group flex items-center gap-3 bg-cover bg-center px-4 py-3 transition-colors hover:bg-[#102435] sm:px-5" style={observation.title === 'Damaged Safety Barricade' ? { backgroundImage: `linear-gradient(90deg, rgba(10, 23, 34, 0.94), rgba(10, 23, 34, 0.32)), url(${damagedBarricadeImg})` } : observation.title === 'Dust Emission Near Processing Plant' ? { backgroundImage: `linear-gradient(90deg, rgba(10, 23, 34, 0.94), rgba(10, 23, 34, 0.32)), url(${dustEmissionImg})` } : observation.title === 'Minor Water Runoff Issue' ? { backgroundImage: `linear-gradient(90deg, rgba(10, 23, 34, 0.94), rgba(10, 23, 34, 0.32)), url(${waterRunoffImg})` } : observation.title === 'Structural Weakness in Support Beam' ? { backgroundImage: `linear-gradient(90deg, rgba(10, 23, 34, 0.94), rgba(10, 23, 34, 0.32)), url(${structuralWeaknessImg})` } : observation.title === 'Equipment Maintenance Overdue' ? { backgroundImage: `linear-gradient(90deg, rgba(10, 23, 34, 0.94), rgba(10, 23, 34, 0.32)), url(${equipmentMaintenanceImg})` } : undefined}><div className="h-11 w-14 shrink-0 rounded-md bg-cover bg-center" style={{ backgroundImage: `url(${observationImages[observation.title]})` }} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-[#E8F0F3]">{observation.title}</p><p className="mt-1 truncate text-[10px] text-[#8299A7]">{observation.category} · {observation.mineId}</p><p className="mt-1 hidden truncate text-[10px] text-[#A9BBC4] md:block">{observation.description}</p></div><div className="hidden items-center gap-2 sm:flex"><Badge status={observation.severity} /><span className="text-[10px] text-[#718B9A]">{observation.status.replace('_', ' ')}</span></div><ChevronRight className="h-4 w-4 shrink-0 text-[#527084] transition-transform group-hover:translate-x-1" /></div>)}</div></CardContent>
        </Card>

        <Card className="overflow-hidden border-[#21415A] bg-[#0a172245]">
          <div className="relative border-b border-[#21415A] px-4 py-4 sm:px-5"><img src={aiRiskIntelligenceImg} alt="" className="absolute right-4 top-3 h-9 w-12 rounded object-cover opacity-70" /><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#4DA3FF]" /><h2 className="text-base font-semibold text-[#F4F7F8]">AI Risk Intelligence</h2></div><p className="mt-1 text-[10px] text-[#8299A7]">Real-time risk analysis across all mines</p></div>
          <CardContent className="space-y-3 p-4 sm:p-5">{data.riskIntelligence.slice(0, 3).map((risk) => { const tone = riskTone(risk.riskLevel); return <div key={risk.mineId} className="rounded-lg border border-[#234357] bg-[#101D27] bg-cover bg-center p-3" style={{ backgroundImage: `linear-gradient(90deg, rgba(16, 29, 39, 0.95), rgba(16, 29, 39, 0.38)), url(${mineImages[risk.mineId]})` }}><div className="flex items-center gap-3"><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-[#E8F0F3]">Mine {risk.mineId.replace('mine-', '#')}</span><span className={`text-xl font-bold ${tone.text}`}>{risk.riskScore}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#1E3545]"><div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${risk.riskScore}%` }} /></div><div className="mt-2 flex items-center justify-between text-[9px] text-[#8299A7]"><span>{tone.label}</span><span>{risk.confidence}% confidence</span></div></div></div></div>; })}</CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-[#21415A] bg-[#0a172245]"><div className="flex items-center justify-between border-b border-[#21415A] px-4 py-4 sm:px-5"><div><h2 className="text-base font-semibold text-[#F4F7F8]">Compliance Trend</h2><p className="mt-1 text-[10px] text-[#8299A7]">Performance across reporting periods</p></div><BarChart3 className="h-4 w-4 text-[#4DA3FF]" /></div><CardContent className="p-3 sm:p-5"><ComplianceTrendChart data={data.complianceTrend} /></CardContent></Card>
    </div>
  );
};
