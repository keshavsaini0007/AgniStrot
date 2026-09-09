import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: string;
  backgroundImage?: string;
  delay?: number;
}

export const StatCard = ({ icon: Icon, label, value, color, backgroundImage, delay = 0 }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="relative isolate overflow-hidden bg-[#1114163d] border border-[#252A2D] rounded-xl p-4"
  >
    {backgroundImage && (
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center opacity-70"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(17, 20, 22, 0.78), rgba(17, 20, 22, 0.32)), url(${backgroundImage})`,
        }}
      />
    )}
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm text-[#8D969B]">{label}</p>
        <p className="text-xl font-bold text-[#F4F5F5]">{value}</p>
      </div>
    </div>
  </motion.div>
);
