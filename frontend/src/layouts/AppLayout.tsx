import { Outlet } from 'react-router-dom';
import { Sidebar, Topbar } from '@/components/layout';
import { useAlertSocket } from '@/hooks/useAlertSocket';
import backgroundImage from '../../assets/images/bg.png';

export const AppLayout = () => {
  useAlertSocket();

  return (
    <div
      className="min-h-screen bg-[#0B0D0E] bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: `linear-gradient(rgba(5, 12, 18, 0.72), rgba(5, 12, 18, 0.86)), url(${backgroundImage})`,
      }}
    >
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