import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  trend?: string;
  color: string;
  image?: string;
}

export const KPICard = ({ icon: Icon, label, value, trend, color, image }: KPICardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-[#1114163d] border border-[#252A2D] rounded-xl p-6"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-[#8D969B] mb-1">{label}</p>
        <p className="text-2xl font-bold text-[#F4F5F5]">{value}</p>
        {trend && (
          <p className="text-xs text-[#35C759] mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </p>
        )}
      </div>
      {image ? (
        <img src={image} alt={label} className="w-12 h-12 rounded-lg object-contain" />
      ) : Icon ? (
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      ) : null}
    </div>
  </motion.div>
);
