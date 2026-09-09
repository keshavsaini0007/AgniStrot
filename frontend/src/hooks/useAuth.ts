import { useAuthStore } from '@/store/authStore';

/**
 * Frontend permission map — scoped to the 4 canonical roles. The backend is the
 * real gatekeeper (server-side scoping per role); this map only controls which
 * nav items/screens are shown.
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  field_officer: ['inspections.read', 'incidents.read', 'attendance.read', 'alerts.read'],
  mine_official: [
    'inspections.read',
    'incidents.read',
    'attendance.read',
    'alerts.read',
    'alerts.update',
    'reports.read',
    'dashboard.read',
  ],
  corporate_manager: [
    'inspections.read',
    'incidents.read',
    'attendance.read',
    'alerts.read',
    'alerts.update',
    'reports.read',
    'audit.read',
    'analytics.read',
    'gis.read',
    'documents.read',
    'dashboard.read',
  ],
  regulator: [
    'inspections.read',
    'incidents.read',
    'attendance.read',
    'alerts.read',
    'reports.read',
    'audit.read',
    'analytics.read',
    'gis.read',
    'dashboard.read',
  ],
};

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    fetchCurrentUser,
    clearError,
  } = useAuthStore();

  const hasPermission = (permission: string) => {
    if (!user) return false;
    const permissions = ROLE_PERMISSIONS[user.role] || [];
    return permissions.includes('*') || permissions.includes(permission);
  };

  const can = (resource: string, action: string) => {
    return hasPermission(`${resource}.${action}`);
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    fetchCurrentUser,
    clearError,
    hasPermission,
    can,
  };
};