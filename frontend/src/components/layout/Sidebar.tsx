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
  Sparkles,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { env } from '@/config/env';
import logoImg from '../../../assets/images/logo.png';

const workspaceNav = [
  { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  { name: 'Inspections', href: '/app/inspections', icon: ClipboardCheck },
  { name: 'Incidents', href: '/app/incidents', icon: AlertTriangle },
  { name: 'Alerts', href: '/app/alerts', icon: AlarmClock },
  { name: 'Attendance', href: '/app/attendance', icon: Users2 },
  { name: 'AI Risk Intelligence', href: '/app/analytics', icon: Brain },
  { name: 'GIS Intelligence', href: '/app/gis', icon: Globe },
  { name: 'Reports', href: '/app/reports', icon: FileBarChart },
  { name: 'Documents', href: '/app/documents', icon: FolderOpen },
  { name: 'Audit Logs', href: '/app/audit-logs', icon: History },
  { name: 'Settings', href: '/app/settings', icon: Settings },
];

const demoNav = [
  { name: 'Mines', href: '/app/mines', icon: MapPin },
  { name: 'Corrective Actions', href: '/app/corrective-actions', icon: CheckCircle },
  { name: 'Compliance', href: '/app/compliance', icon: FileText },
  { name: 'Notifications', href: '/app/notifications', icon: Bell },
  { name: 'Users', href: '/app/users', icon: Users },
];

// Real-mode admin — only corporate managers provision accounts (backend 403s
// everyone else on /users). Shown in real mode, hidden on the demo build.
const corporateNav = [{ name: 'Users', href: '/app/users', icon: Users }];

export const Sidebar = () => {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user } = useAuth();

  const renderNav = (items: typeof workspaceNav) =>
    items.map((item) => (
      <NavLink
        key={item.name}
        to={item.href}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive
              ? 'bg-[#D88A32]/10 text-[#D88A32]'
              : 'text-[#A4ADB2] hover:text-[#F4F5F5] hover:bg-[#171A1D]'
          }`
        }
        onClick={() => {
          if (window.innerWidth < 1024) {
            setSidebarOpen(false);
          }
        }}
      >
        <item.icon className="w-5 h-5" />
        {item.name}
      </NavLink>
    ));

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
        className={`fixed top-0 left-0 z-50 h-full w-[280px] bg-[#1114163d] border-r border-[#252A2D] lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#252A2D]">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="AgniStrot" className="h-10 w-[118px] object-contain" />
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-[#8D969B] hover:text-[#F4F5F5]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {renderNav(workspaceNav)}

            {env.DEMO_FEATURES && (
              <>
                <div className="px-3 pt-5 pb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[#8D969B]">
                  <Sparkles className="w-3.5 h-3.5" /> Demo / pitch preview
                </div>
                {renderNav(demoNav)}
              </>
            )}

            {!env.DEMO_FEATURES && user?.role === 'corporate_manager' && (
              <>
                <div className="px-3 pt-5 pb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[#8D969B]">
                  <Users className="w-3.5 h-3.5" /> Administration
                </div>
                {renderNav(corporateNav)}
              </>
            )}
          </nav>

          {/* User info */}
          <div className="px-3 py-4 border-t border-[#252A2D]">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-[#252A2D] flex items-center justify-center">
                <span className="text-sm font-medium text-[#F4F5F5]">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#F4F5F5] truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-[#8D969B] capitalize">
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