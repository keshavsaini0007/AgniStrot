import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton = ({ className = '', style }: SkeletonProps) => {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
      className={`bg-[#171A1D] rounded ${className}`}
      style={style}
    />
  );
};

export const TableSkeleton = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => {
  return (
    <div className="space-y-3" role="status" aria-label="Loading table">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center space-x-4 border-b border-[#1E3545] pb-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={`h-4 ${colIndex === 0 ? 'w-16' : colIndex === columns - 1 ? 'w-24' : 'flex-1'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton = () => {
  return (
    <div className="bg-[#1114163d] border border-[#252A2D] rounded-xl p-6 space-y-4" role="status" aria-label="Loading card">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
};

export const PageHeaderSkeleton = () => (
  <div className="relative overflow-hidden rounded-2xl border border-[#25445B] bg-[#07121C] px-5 py-6 sm:px-7 sm:py-7" role="status" aria-label="Loading page header">
    <Skeleton className="h-2 w-44 bg-[#25445B]" />
    <Skeleton className="mt-4 h-9 w-56 bg-[#1E3545]" />
    <Skeleton className="mt-3 h-4 w-full max-w-xl bg-[#1E3545]" />
    <Skeleton className="mt-6 h-2 w-40 bg-[#25445B]" />
  </div>
);

export const StatGridSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="status" aria-label="Loading statistics">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="rounded-xl border border-[#21415A] bg-[#0C1A27] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-7 w-16" /></div>
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
    ))}
  </div>
);

export const ListSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3" role="status" aria-label="Loading list">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="flex items-center gap-3 border-b border-[#1E3545] px-4 py-3">
        <Skeleton className="h-11 w-14 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-3 w-2/5" /><Skeleton className="h-2 w-1/3" /></div>
        <Skeleton className="h-3 w-16" />
      </div>
    ))}
  </div>
);

export const ChartSkeleton = ({ className = 'h-48' }: { className?: string }) => (
  <div className={`flex items-end gap-2 rounded-lg border border-[#21415A] bg-[#0C1A27] p-4 ${className}`} role="status" aria-label="Loading chart">
    {[35, 55, 42, 70, 48, 82, 62, 76, 52, 66].map((height, index) => <Skeleton key={index} className="flex-1 rounded-t bg-[#21415A]" style={{ height: `${height}%` }} />)}
  </div>
);

export const MapSkeleton = () => (
  <div className="h-130 rounded-xl border border-[#21415A] bg-[#0C1A27] p-4" role="status" aria-label="Loading map">
    <Skeleton className="h-full w-full rounded-lg bg-[#132632]" />
  </div>
);

export const DetailSkeleton = () => (
  <div className="space-y-6" role="status" aria-label="Loading details">
    <PageHeaderSkeleton />
    <StatGridSkeleton />
    <CardSkeleton />
    <CardSkeleton />
  </div>
);