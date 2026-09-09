import type { UserRole } from '@/types';

/**
 * Canonical roles (mirror backend). Friendly labels are kept here so the UI can
 * display pitch-style names without introducing non-canonical roles.
 */
export const ROLE_CONFIG: Record<UserRole, { label: string; description: string; color: string }> = {
  field_officer: {
    label: 'Field Officer',
    description: 'Captures inspections, incidents and attendance from the field',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  mine_official: {
    label: 'Mine Officer',
    description: 'Mine operations management',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  corporate_manager: {
    label: 'Corporate Manager',
    description: 'Corporate oversight',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  },
  regulator: {
    label: 'Regulator',
    description: 'Regulatory compliance',
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  },
};

export const getRoleConfig = (role: UserRole) => {
  return ROLE_CONFIG[role] || ROLE_CONFIG.field_officer;
};