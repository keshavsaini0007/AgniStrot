import type { UserRole } from '@/types';

export const ROLE_CONFIG: Record<UserRole, { label: string; description: string; color: string }> = {
  system_admin: {
    label: 'System Admin',
    description: 'Full system access',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  mine_officer: {
    label: 'Mine Officer',
    description: 'Mine operations management',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  field_inspector: {
    label: 'Field Inspector',
    description: 'Inspections and observations',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  department_officer: {
    label: 'Department Officer',
    description: 'Departmental operations',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  contractor: {
    label: 'Contractor',
    description: 'Contractor operations',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  corporate_management: {
    label: 'Corporate Management',
    description: 'Corporate oversight',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  },
  regulatory_authority: {
    label: 'Regulatory Authority',
    description: 'Regulatory compliance',
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  },
  auditor: {
    label: 'Auditor',
    description: 'Audit and review',
    color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  },
};

export const getRoleConfig = (role: UserRole) => {
  return ROLE_CONFIG[role] || ROLE_CONFIG.mine_officer;
};