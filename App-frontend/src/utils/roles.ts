import type { UserRole } from '@/types';

export const ROLE_CONFIG: Record<UserRole, { label: string; description: string; color: string; bg: string }> = {
  system_admin: { label: 'System Admin', description: 'Full system access', color: '#FF4D4F', bg: 'rgba(255, 77, 79, 0.15)' },
  mine_officer: { label: 'Mine Officer', description: 'Mine operations management', color: '#4DA3FF', bg: 'rgba(77, 163, 255, 0.15)' },
  field_inspector: { label: 'Field Inspector', description: 'Inspections and observations', color: '#35C759', bg: 'rgba(53, 199, 89, 0.15)' },
  department_officer: { label: 'Department Officer', description: 'Departmental operations', color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.15)' },
  contractor: { label: 'Contractor', description: 'Contractor operations', color: '#F5B942', bg: 'rgba(245, 185, 66, 0.15)' },
  corporate_management: { label: 'Corporate Management', description: 'Corporate oversight', color: '#FF8C42', bg: 'rgba(255, 140, 66, 0.15)' },
  regulatory_authority: { label: 'Regulatory Authority', description: 'Regulatory compliance', color: '#22D3EE', bg: 'rgba(34, 211, 238, 0.15)' },
  auditor: { label: 'Auditor', description: 'Audit and review', color: '#818CF8', bg: 'rgba(129, 140, 248, 0.15)' },
};

export const getRoleConfig = (role: UserRole) => {
  return ROLE_CONFIG[role] || ROLE_CONFIG.mine_officer;
};
