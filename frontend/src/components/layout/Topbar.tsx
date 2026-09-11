import { Menu, Bell, Search, LogOut } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { useAlerts } from '@/hooks/useAlerts';
import { useSocket } from '@/contexts/SocketContext';
import { Button } from '@/components/ui/Button';
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
    <header className="sticky top-0 z-30 h-16 bg-[#0B0D0E]/80 backdrop-blur-md border-b border-[#252A2D]">
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

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            leftIcon={<LogOut className="w-4 h-4" />}
            className="hidden sm:flex"
          >
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};