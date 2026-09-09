import { useAuthStore } from '@/store/authStore';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, error, login, logout, fetchCurrentUser, clearError } = useAuthStore();

  const hasPermission = (permission: string) => {
    if (!user) return false;
    const rolePermissions: Record<string, string[]> = {
      mine_officer: ['mines.read', 'inspections.read', 'observations.read', 'corrective_actions.read', 'compliance.read', 'documents.read', 'analytics.read'],
    };
    const permissions = rolePermissions[user.role] || [];
    return permissions.includes(permission);
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