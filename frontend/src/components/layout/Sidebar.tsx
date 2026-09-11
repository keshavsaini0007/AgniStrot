import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  ClipboardCheck,
  AlertTriangle,
  AlarmClock,
  Users2,
  Brain,
  Globe,
  FileBarChart,
  FolderOpen,
  History,
  Settings,
  MapPin,
  CheckCircle,
  FileText,
  Bell,
  Users,
  X,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { useAlerts } from '@/hooks/useAlerts';
import { useSocket } from '@/contexts/SocketContext';
import logoImg from '../../../assets/images/logo.png';

// Navigation items with required permissions. Mines/corrective-actions/compliance/
// notifications are all real, backend-backed routes now (no demo-only gating).
const workspaceNav = [
  { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard, permission: 'dashboard.read' },
  { name: 'Inspections', href: '/app/inspections', icon: ClipboardCheck, permission: 'inspections.read' },
  { name: 'Incidents', href: '/app/incidents', icon: AlertTriangle, permission: 'incidents.read' },
  { name: 'Alerts', href: '/app/alerts', icon: AlarmClock, permission: 'alerts.read' },
  { name: 'Attendance', href: '/app/attendance', icon: Users2, permission: 'attendance.read' },
  { name: 'Mines', href: '/app/mines', icon: MapPin, permission: 'mines.read' },
  { name: 'Corrective Actions', href: '/app/corrective-actions', icon: CheckCircle, permission: 'correctiveactions.read' },
  { name: 'Compliance', href: '/app/compliance', icon: FileText, permission: 'compliance.read' },
  { name: 'Notifications', href: '/app/notifications', icon: Bell, permission: 'notifications.read' },
  { name: 'AI Risk Intelligence', href: '/app/analytics', icon: Brain, permission: 'analytics.read' },
  { name: 'GIS Intelligence', href: '/app/gis', icon: Globe, permission: 'gis.read' },
  { name: 'Reports', href: '/app/reports', icon: FileBarChart, permission: 'reports.read' },
  { name: 'Documents', href: '/app/documents', icon: FolderOpen, permission: 'documents.read' },
  { name: 'Audit Logs', href: '/app/audit-logs', icon: History, permission: 'audit.read' },
  { name: 'Settings', href: '/app/settings', icon: Settings, permission: 'settings.read' },
];

// User directory — corporate managers provision accounts (backend 403s everyone
// else on /users). Visible in both real and demo builds.
const corporateNav = [{ name: 'Users', href: '/app/users', icon: Users, permission: 'users.read' }];

const itemTransition = { type: 'spring', stiffness: 480, damping: 36, mass: 0.6 } as const;

export const Sidebar = () => {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user, hasPermission } = useAuth();
  const { data: alerts } = useAlerts({ limit: 50 });
  const { isConnected } = useSocket();

  const openAlertsCount = (alerts?.data ?? []).filter((a) => a.status === 'open').length;

  // Filter navigation items based on user permissions
  const filteredWorkspaceNav = workspaceNav.filter((item) => 
    !item.permission || hasPermission(item.permission)
  );

  const renderNav = (items: typeof workspaceNav) =>
    items.map((item) => {
      const isNotifications = item.href === '/app/notifications';
      const showBadge = isNotifications && openAlertsCount > 0;
      
      return (
        <NavLink
          key={item.name}
          to={item.href}
          className={({ isActive }) =>
            `group relative flex items-center gap-3 rounded-[10px] px-2.5 py-2 text-[13px] font-medium transition-all duration-200 ease-out hover:translate-x-[2px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#159BFF]/50 ${
              isActive
                ? 'text-[#F4F7F8]'
                : 'text-[#8D969B] hover:bg-[#0A1720] hover:text-[#E8F0F3]'
            }`
          }
          onClick={() => {
            if (window.innerWidth < 1024) {
              setSidebarOpen(false);
            }
          }}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <>
                  <motion.span
                    layoutId="sidebarActiveBg"
                    transition={itemTransition}
                    className="absolute inset-0 rounded-[10px] border border-[#F28C18]/30 bg-[#F28C18]/[0.09]"
                  />
                  <motion.span
                    layoutId="sidebarActiveBar"
                    transition={itemTransition}
                    className="absolute left-0 top-[10px] h-5 w-[3px] rounded-r-full bg-[#F28C18]"
                  />
                </>
              )}
              <span
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-[#F28C18]/15 text-[#F28C18]'
                    : 'bg-[#0A1720]/70 text-[#7F8B94] group-hover:bg-[#F28C18]/10 group-hover:text-[#F28C18]'
                }`}
              >
                <item.icon className="h-[17px] w-[17px]" strokeWidth={1.8} />
              </span>
              <span
                className={`relative z-10 flex-1 transition-colors duration-200 ${
                  isActive ? 'font-semibold text-[#F4F7F8]' : 'text-[#8D969B] group-hover:text-[#F4F7F8]'
                }`}
              >
                {item.name}
              </span>
              {showBadge && (
                <span className="relative z-10 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#FF3B4A] px-1.5 text-xs font-semibold text-white">
                  {openAlertsCount > 99 ? '99+' : openAlertsCount}
                </span>
              )}
              {isNotifications && isConnected && (
                <span className="relative z-10 h-1.5 w-1.5 rounded-full bg-[#28D76F] shadow-[0_0_6px_rgba(40,215,111,0.6)]" title="Real-time connected" />
              )}
            </>
          )}
        </NavLink>
      );
    });

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: sidebarOpen ? 0 : -280,
        }}
        className={`fixed top-0 left-0 z-50 h-full w-[280px] bg-[#050D12] border-r border-[#101A22] lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center px-6 py-5 border-b border-[#101A22]">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="AgniStrot" className="h-14 w-[118px] object-contain" />
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-[#8D969B] hover:text-[#F4F5F5]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#101A22] hover:scrollbar-thumb-[#25323B]">
            {renderNav(filteredWorkspaceNav)}

            {user?.role === 'corporate_manager' && (
              <>
                <div className="mt-3 px-3 pt-2 pb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#61707A]">
                  <Users className="w-3.5 h-3.5" /> Administration
                </div>
                {renderNav(corporateNav)}
              </>
            )}
          </nav>

          {/* User info */}
          <div className="px-3 py-3 border-t border-[#101A22]">
            <div className="flex items-center gap-3 rounded-[10px] px-3 py-2 transition-colors duration-200 hover:bg-[#0A1720]/60">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F28C18]/15 text-sm font-semibold text-[#F28C18]">
                <span>{user?.name?.charAt(0) || 'U'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#F4F7F8] truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-[11px] text-[#7F8B94] capitalize truncate">
                  {user?.role?.replace('_', ' ') || 'Role'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
};