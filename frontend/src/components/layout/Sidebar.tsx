import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  MapPin,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle,
  FileText,
  FolderOpen,
  Brain,
  BarChart3,
  Globe,
  FileBarChart,
  Bell,
  Users,
  History,
  Settings,
  X,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';

const navigation = [
  { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  { name: 'Mines', href: '/app/mines', icon: MapPin },
  { name: 'Inspections', href: '/app/inspections', icon: ClipboardCheck },
  { name: 'Observations', href: '/app/observations', icon: AlertTriangle },
  { name: 'Corrective Actions', href: '/app/corrective-actions', icon: CheckCircle },
  { name: 'Compliance', href: '/app/compliance', icon: FileText },
  { name: 'Documents', href: '/app/documents', icon: FolderOpen },
  { name: 'AI Risk Intelligence', href: '/app/analytics', icon: Brain },
  { name: 'Analytics', href: '/app/analytics', icon: BarChart3 },
  { name: 'GIS Intelligence', href: '/app/gis', icon: Globe },
  { name: 'Reports', href: '/app/reports', icon: FileBarChart },
  { name: 'Notifications', href: '/app/notifications', icon: Bell },
  { name: 'Users', href: '/app/users', icon: Users },
  { name: 'Audit Logs', href: '/app/audit-logs', icon: History },
  { name: 'Settings', href: '/app/settings', icon: Settings },
];

export const Sidebar = () => {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user } = useAuth();

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
        className={`fixed top-0 left-0 z-50 h-full w-[280px] bg-[#111416] border-r border-[#252A2D] lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#252A2D]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#D88A32] flex items-center justify-center">
                <span className="text-white font-bold text-sm">SM</span>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-[#F4F5F5]">Smart Mine</h1>
                <p className="text-xs text-[#8D969B]">Governance System</p>
              </div>
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
            {navigation.map((item) => (
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
            ))}
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
                <p className="text-xs text-[#8D969B] truncate">
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