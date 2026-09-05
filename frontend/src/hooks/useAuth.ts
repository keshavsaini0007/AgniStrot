import { useAuthStore } from '@/store/authStore';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, error, login, logout, fetchCurrentUser, clearError } = useAuthStore();

  const hasPermission = (permission: string) => {
    if (!user) return false;
    // Simple permission check based on role
    const rolePermissions: Record<string, string[]> = {
      system_admin: ['*'],
      mine_officer: ['mines.read', 'inspections.read', 'observations.read', 'corrective_actions.read', 'compliance.read'],
      field_inspector: ['inspections.create', 'observations.create', 'observations.read'],
      department_officer: ['corrective_actions.read', 'corrective_actions.update'],
      corporate_management: ['mines.read', 'inspections.read', 'observations.read', 'analytics.read'],
      regulatory_authority: ['mines.read', 'inspections.read', 'compliance.read'],
      auditor: ['audit_logs.read', 'mines.read', 'inspections.read'],
      contractor: ['corrective_actions.read', 'documents.read'],
    };
    
    const permissions = rolePermissions[user.role] || [];
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