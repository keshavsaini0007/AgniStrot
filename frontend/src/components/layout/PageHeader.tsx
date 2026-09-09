import type { ReactNode } from 'react';
import mineOperationsImg from '../../../assets/images/Mines.png';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  action?: ReactNode;
  backgroundImage?: string;
}

export const PageHeader = ({ title, subtitle, action, backgroundImage = mineOperationsImg }: PageHeaderProps) => (
  <div className="relative isolate overflow-hidden rounded-2xl border border-[#25445B] bg-[#07121C] px-5 py-6 sm:px-7 sm:py-7">
    <img src={backgroundImage} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-90" />
    <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#07121C_4%,rgba(7,18,28,0.08)_46%,rgba(7,18,28,0.1)_100%)]" />
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-[#D88A32]">Operations control / live workspace</p>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#F4F7F8]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#B3C5D0]">{subtitle}</p>
      </div>
      {action}
    </div>
    <div className="mt-5 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#B3C5D0]"><span className="h-2 w-2 rounded-full bg-[#35C759] shadow-[0_0_10px_#35C759]" />System live / field network connected</div>
  </div>
);
