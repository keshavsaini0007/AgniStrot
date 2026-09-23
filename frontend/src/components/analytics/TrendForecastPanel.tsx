import { Activity, TrendingUp, Target, ListChecks } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import type { SiteTrend, TrendDirection } from '@/types';

interface TrendForecastPanelProps {
  trend: SiteTrend | undefined;
}

const DIRECTION_META: Record<TrendDirection, { label: string; tone: string; glyph: string }> = {
  increasing: { label: 'Increasing', tone: 'text-[#FF4D4F]', glyph: '▲' },
  decreasing: { label: 'Improving', tone: 'text-emerald-400', glyph: '▼' },
  stable: { label: 'Stable', tone: 'text-[#8299A7]', glyph: '—' },
  volatile: { label: 'Volatile', tone: 'text-amber-400', glyph: '↕' },
  'new-activity': { label: 'New activity', tone: 'text-[#4DA3FF]', glyph: '✚' },
  'insufficient-data': { label: 'Insufficient data', tone: 'text-[#8299A7]', glyph: '…' },
};

const MAGNITUDE_TONE: Record<string, string> = {
  high: 'bg-[#FF4D4F]',
  medium: 'bg-amber-400',
  low: 'bg-[#8299A7]',
};

const CATEGORY_LABELS: Array<{ key: 'inspections' | 'incidents' | 'alerts'; label: string }> = [
  { key: 'inspections', label: 'Inspections' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'alerts', label: 'Alerts' },
];

export const TrendForecastPanel = ({ trend }: TrendForecastPanelProps) => {
  if (!trend) return null;

  const { classification, forecast, contributors } = trend;
  const overall = DIRECTION_META[classification.overall] ?? DIRECTION_META['insufficient-data'];
  const bandLabel =
    forecast.projectedBand === null
      ? 'Insufficient data'
      : `likely ${forecast.projectedBand}`;
  const bandTone =
    forecast.projectedBand === 'CRITICAL' || forecast.projectedBand === 'HIGH'
      ? 'text-[#FF4D4F]'
      : forecast.projectedBand === 'MEDIUM'
        ? 'text-amber-400'
        : 'text-emerald-400';

  const methodLabel =
    forecast.method === 'linear-regression'
      ? 'Linear regression'
      : forecast.method === 'moving-average'
        ? 'Moving average'
        : 'Not projected';

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* ── Trend classification ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#4DA3FF]" />
            <h3 className="text-lg font-semibold text-[#F4F5F5]">Trend</h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-[#21415A] bg-[#101D27] p-3">
            <p className="text-[10px] text-[#8299A7]">Overall trajectory</p>
            <p className={`mt-1 text-xl font-semibold ${overall.tone}`}>
              <span className="mr-2">{overall.glyph}</span>
              {overall.label}
            </p>
            <p className="mt-1 text-[11px] text-[#8299A7]">confidence: {classification.confidence}</p>
          </div>

          <div className="space-y-2">
            {CATEGORY_LABELS.map(({ key, label }) => {
              const cat = classification.perCategory[key];
              const meta = DIRECTION_META[cat.direction] ?? DIRECTION_META['insufficient-data'];
              const change =
                cat.percentChange === null
                  ? 'new activity'
                  : `${cat.percentChange >= 0 ? '+' : ''}${cat.percentChange}%`;
              return (
                <div key={key} className="flex items-center justify-between rounded-md border border-[#21415A] bg-[#101D27] px-3 py-2">
                  <span className="text-sm text-[#A4ADB2]">{label}</span>
                  <span className={`text-sm font-medium ${meta.tone}`}>
                    {meta.glyph} {meta.label} {change !== 'new activity' && <span className="text-[#8299A7]">({change})</span>}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] leading-relaxed text-[#8299A7]">{classification.label}</p>
        </CardContent>
      </Card>

      {/* ── 30-day forecast ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#A78BFA]" />
            <h3 className="text-lg font-semibold text-[#F4F5F5]">30-Day Forecast</h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-[#21415A] bg-[#101D27] p-3">
            <p className="text-[10px] text-[#8299A7]">Projected risk band</p>
            <p className={`mt-1 text-xl font-semibold ${bandTone}`}>{bandLabel}</p>
            {forecast.projectedScore !== null && (
              <p className="mt-1 text-[11px] text-[#8299A7]">
                score {forecast.baselineScore} → {forecast.projectedScore}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border border-[#21415A] bg-[#101D27] p-2 text-center">
              <p className="text-[10px] text-[#8299A7]">Inspections</p>
              <p className="text-sm font-semibold text-[#F4F7F8]">{forecast.next30d.inspections ?? '—'}</p>
            </div>
            <div className="rounded-md border border-[#21415A] bg-[#101D27] p-2 text-center">
              <p className="text-[10px] text-[#8299A7]">Incidents</p>
              <p className="text-sm font-semibold text-[#F4F7F8]">{forecast.next30d.incidents ?? '—'}</p>
            </div>
            <div className="rounded-md border border-[#21415A] bg-[#101D27] p-2 text-center">
              <p className="text-[10px] text-[#8299A7]">Alerts</p>
              <p className="text-sm font-semibold text-[#F4F7F8]">{forecast.next30d.alerts ?? '—'}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-[#21415A] px-2 py-0.5 text-[10px] text-[#8299A7]">{methodLabel}</span>
            <span className="rounded-full border border-[#21415A] px-2 py-0.5 text-[10px] text-[#8299A7]">confidence: {forecast.confidence}</span>
            <span className="rounded-full border border-[#21415A] px-2 py-0.5 text-[10px] text-[#8299A7]">
              {DIRECTION_META[forecast.bandTrend]?.label ?? forecast.bandTrend}
            </span>
          </div>

          <p className="text-[10px] leading-relaxed text-[#8299A7]">{forecast.label}</p>
        </CardContent>
      </Card>

      {/* ── Top contributors ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-[#D88A32]" />
            <h3 className="text-lg font-semibold text-[#F4F5F5]">Top Contributors</h3>
          </div>
        </CardHeader>
        <CardContent>
          {contributors.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Activity className="w-6 h-6 text-[#8299A7]" />
              <p className="text-sm text-[#8299A7]">No notable contributors in the window.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {contributors.map((c) => {
                const glyph = c.direction === 'increasing' ? '▲' : c.direction === 'decreasing' ? '▼' : '—';
                const tone = c.direction === 'increasing' ? 'text-[#FF4D4F]' : c.direction === 'decreasing' ? 'text-emerald-400' : 'text-[#8299A7]';
                return (
                  <li key={c.key} className="rounded-md border border-[#21415A] bg-[#101D27] p-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-medium text-[#F4F7F8]">
                        <span className={`h-2 w-2 rounded-full ${MAGNITUDE_TONE[c.magnitude] ?? 'bg-[#8299A7]'}`} />
                        {c.label}
                      </span>
                      <span className={`text-sm font-semibold ${tone}`}>
                        {glyph} {c.count}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#8299A7]">{c.detail}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};