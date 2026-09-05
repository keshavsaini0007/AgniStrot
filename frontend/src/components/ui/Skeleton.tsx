import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className = '' }: SkeletonProps) => {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
      className={`bg-[#171A1D] rounded ${className}`}
    />
  );
};

export const TableSkeleton = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
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
    <div className="bg-[#111416] border border-[#252A2D] rounded-xl p-6 space-y-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
};