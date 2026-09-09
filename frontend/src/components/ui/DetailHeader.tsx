import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import mineOperationsImg from '../../../assets/images/Mines.png';

interface DetailHeaderProps {
  backTo: string;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  action?: ReactNode;
}

export const DetailHeader = ({ backTo, title, subtitle, badges, action }: DetailHeaderProps) => (
  <div className="relative isolate overflow-hidden rounded-2xl border border-[#25445B] bg-[#07121C] px-4 py-5 sm:px-6">
    <img src={mineOperationsImg} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-90" />
    <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#07121C_4%,rgba(7,18,28,0.25)_50%,rgba(7,18,28,0.08)_100%)]" />
    <div className="flex items-center gap-4">
    <Link
      to={backTo}
      className="p-2 text-[#8D969B] hover:text-[#F4F5F5] hover:bg-[#171A1D] rounded-lg transition-colors"
    >
      <ArrowLeft className="w-5 h-5" />
    </Link>
    <div className="flex-1">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-[#F4F5F5]">{title}</h1>
        {badges}
      </div>
      {subtitle && <p className="text-[#8D969B]">{subtitle}</p>}
    </div>
    {action}
    </div>
  </div>
);
