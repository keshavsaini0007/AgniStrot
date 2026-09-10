import { useAuthStore } from '@/store/authStore';

/**
 * Frontend permission map — scoped to the 4 canonical roles. The backend is the
 * real gatekeeper (server-side scoping per role); this map only controls which
 * nav items/screens are shown.
 * 
 * Based on backend RBAC enforcement from PRD:
 * - field_officer: mobile capture only (inspections, incidents, attendance)
 * - mine_official: own-site management (all except audit)
 * - corporate_manager: all-sites oversight (everything)
 * - regulator: read-only oversight (no alert resolution, full audit access)
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  field_officer: [
    'dashboard.read',
    'inspections.read',
    'inspections.create', // Mobile sync
    'incidents.read',
    'incidents.create',   // Mobile sync
    'attendance.read',
    'attendance.create',  // Mobile sync
  ],
  mine_official: [
    'dashboard.read',
    'inspections.read',
    'incidents.read',
    'alerts.read',
    'alerts.update',      // Acknowledge/resolve
    'attendance.read',
    'analytics.read',     // AI risk scoring for own site
    'gis.read',           // GIS markers for own site
    'reports.read',       // Statutory reports for own site
    'documents.read',     // OCR documents for own site
    'documents.create',   // Ingest documents
    'mines.read',         // Own-site directory
    'correctiveactions.read', // Derived feed (own site)
    'compliance.read',        // Derived compliance (own site)
    'notifications.read',     // Live alert feed alias
    'settings.read',
  ],
  corporate_manager: [
    'dashboard.read',
    'inspections.read',
    'incidents.read',
    'alerts.read',
    'alerts.update',      // Acknowledge/resolve/escalate
    'attendance.read',
    'analytics.read',     // AI for all sites
    'gis.read',           // GIS for all sites
    'reports.read',       // Reports for all sites
    'documents.read',     // Documents for all sites
    'documents.confirm',  // Confirm OCR extractions
    'mines.read',         // Mine directory
    'correctiveactions.read', // Derived feed (all sites)
    'compliance.read',        // Derived compliance (all sites)
    'notifications.read',     // Live alert feed alias
    'audit.read',         // Full audit trail
    'users.read',         // User management
    'users.create',       // Register new users
    'settings.read',
  ],
  regulator: [
    'dashboard.read',
    'inspections.read',   // Read-only
    'incidents.read',     // Read-only
    'alerts.read',        // Read-only (no resolution)
    'attendance.read',    // Read-only
    'analytics.read',     // AI for all sites
    'gis.read',           // GIS for all sites
    'reports.read',       // Reports for all sites
    'documents.read',     // Documents read-only
    'mines.read',         // Mine directory
    'correctiveactions.read', // Derived feed (all sites)
    'compliance.read',        // Derived compliance (all sites)
    'notifications.read',     // Live alert feed alias
    'audit.read',         // Full audit trail
    'settings.read',
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