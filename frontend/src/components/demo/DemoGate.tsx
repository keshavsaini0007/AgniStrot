import { env } from '@/config/env';
import { EmptyState } from '@/components/ui/EmptyState';
import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Gates pitch-only screens (no backend counterpart). When VITE_DEMO_FEATURES is
 * false these routes surface an explicit "not available with real data" state
 * instead of fake content.
 */
export const DemoGate = ({ children }: { children?: ReactNode }) => {
  if (env.DEMO_FEATURES) {
    return <>{children}</>;
  }

  return (
    <div className="p-6">
      <EmptyState
        title="Demo module disabled"
        description="This screen is part of the pitch-only demo. Point VITE_DEMO_FEATURES=true with VITE_USE_MOCK_API=true to preview it."
      />
    </div>
  );
};

export const DemoBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-md border border-[#D88A32]/30 bg-[#D88A32]/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-[#D88A32]">
    <Sparkles className="h-3 w-3" /> Demo data
  </span>
);