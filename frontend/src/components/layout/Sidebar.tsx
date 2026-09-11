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

export const Sidebar = () => {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user, hasPermission } = useAuth();

  // Filter navigation items based on user permissions
  const filteredWorkspaceNav = workspaceNav.filter((item) => 
    !item.permission || hasPermission(item.permission)
  );

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
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#252A2D] hover:scrollbar-thumb-[#3A4045]">
            {renderNav(filteredWorkspaceNav)}

            {user?.role === 'corporate_manager' && (
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