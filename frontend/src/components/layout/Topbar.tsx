import { Menu, Bell, Search, LogOut } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { useAlerts } from '@/hooks/useAlerts';
import { useSocket } from '@/contexts/SocketContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export const Topbar = () => {
  const { toggleSidebar } = useUIStore();
  const { logout } = useAuth();
  const { data: alerts } = useAlerts({ limit: 50 });
  const { lastAlertEvent } = useSocket();
  const navigate = useNavigate();
  const [showBadgePulse, setShowBadgePulse] = useState(false);

  const openCount = (alerts?.data ?? []).filter((a) => a.status === 'open').length;

  // Pulse animation when new alert arrives
  useEffect(() => {
    if (lastAlertEvent) {
      setShowBadgePulse(true);
      const timer = setTimeout(() => setShowBadgePulse(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastAlertEvent]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0b0d0e00]/80 backdrop-blur-md border-b border-[#252A2D]">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 text-[#8D969B] hover:text-[#F4F5F5] lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden md:flex items-center gap-2 bg-[#171A1D]/10 border border-[#252A2D] rounded-lg px-4 py-2 w-64">
            <Search className="w-4 h-4 text-[#8D969B]" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent text-sm text-[#F4F5F5] placeholder-[#8D969B] focus:outline-none w-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/app/alerts')}
            className="relative p-2 text-[#8D969B] hover:text-[#F4F5F5] transition-colors"
          >
            <Bell className={`w-5 h-5 ${showBadgePulse ? 'animate-pulse' : ''}`} />
            {openCount > 0 && (
              <span 
                className={`absolute top-1 right-1 w-4 h-4 bg-[#FF4D4F] text-white text-xs rounded-full flex items-center justify-center ${
                  showBadgePulse ? 'animate-bounce' : ''
                }`}
              >
                {openCount > 9 ? '9+' : openCount}
              </span>
            )}
          </button>

          <button
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
            className="group relative hidden h-9 w-9 items-center justify-start overflow-hidden rounded-md border border-[#315064]/60 bg-[#111F29]/80 shadow-[0_2px_10px_rgba(0,0,0,0.2)] transition-all duration-300 hover:w-[122px] hover:border-[#315064] hover:bg-[#172A36] active:translate-x-0.5 active:translate-y-0.5 sm:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D88A32]/50"
          >
            <span className="flex w-9 shrink-0 items-center justify-center transition-all duration-300 group-hover:w-8 group-hover:pl-4">
              <LogOut className="h-4 w-4 text-[#E8F0F3]" />
            </span>
            <span className="pointer-events-none absolute right-0 w-0 overflow-hidden whitespace-nowrap text-xs font-semibold text-[#E8F0F3] opacity-0 transition-all duration-300 group-hover:w-[82px] group-hover:opacity-100 group-hover:pr-3">
              Logout
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};