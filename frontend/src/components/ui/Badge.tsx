import { getStatusConfig } from '@/utils/status';

interface BadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const Badge = ({ status, size = 'sm' }: BadgeProps) => {
  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.color} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};