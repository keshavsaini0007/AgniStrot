import { Outlet } from 'react-router-dom';
import { Sidebar, Topbar } from '@/components/layout';

export const AppLayout = () => {
  return (
    <div className="min-h-screen bg-[#0B0D0E]">
      <Sidebar />
      <div className="lg:pl-[280px]">
        <Topbar />
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};