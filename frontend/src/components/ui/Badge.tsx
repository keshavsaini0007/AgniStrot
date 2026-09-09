import { getStatusConfig } from '@/utils/status';

interface BadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const Badge = ({ status, size = 'sm' }: BadgeProps) => {
  const config = getStatusConfig(status);

  return (
    <span
      className={`font-medium ${config.color} ${size === 'sm' ? 'text-xs' : 'text-sm'}`}
    >
      {config.label}
    </span>
  );
};