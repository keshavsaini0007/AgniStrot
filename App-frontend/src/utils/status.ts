export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: 'Low', color: '#35C759', bg: 'rgba(53, 199, 89, 0.15)' },
  medium: { label: 'Medium', color: '#F5B942', bg: 'rgba(245, 185, 66, 0.15)' },
  high: { label: 'High', color: '#FF8C42', bg: 'rgba(255, 140, 66, 0.15)' },
  critical: { label: 'Critical', color: '#FF4D4F', bg: 'rgba(255, 77, 79, 0.15)' },
  open: { label: 'Open', color: '#4DA3FF', bg: 'rgba(77, 163, 255, 0.15)' },
  in_progress: { label: 'In Progress', color: '#F5B942', bg: 'rgba(245, 185, 66, 0.15)' },
  resolved: { label: 'Resolved', color: '#35C759', bg: 'rgba(53, 199, 89, 0.15)' },
  closed: { label: 'Closed', color: '#8D969B', bg: 'rgba(141, 150, 155, 0.15)' },
  assigned: { label: 'Assigned', color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.15)' },
  reported: { label: 'Reported', color: '#FF8C42', bg: 'rgba(255, 140, 66, 0.15)' },
  verified: { label: 'Verified', color: '#35C759', bg: 'rgba(53, 199, 89, 0.15)' },
  compliant: { label: 'Compliant', color: '#35C759', bg: 'rgba(53, 199, 89, 0.15)' },
  non_compliant: { label: 'Non-Compliant', color: '#FF4D4F', bg: 'rgba(255, 77, 79, 0.15)' },
  pending: { label: 'Pending', color: '#F5B942', bg: 'rgba(245, 185, 66, 0.15)' },
  overdue: { label: 'Overdue', color: '#FF4D4F', bg: 'rgba(255, 77, 79, 0.15)' },
  active: { label: 'Active', color: '#35C759', bg: 'rgba(53, 199, 89, 0.15)' },
  inactive: { label: 'Inactive', color: '#8D969B', bg: 'rgba(141, 150, 155, 0.15)' },
  maintenance: { label: 'Maintenance', color: '#F5B942', bg: 'rgba(245, 185, 66, 0.15)' },
  scheduled: { label: 'Scheduled', color: '#4DA3FF', bg: 'rgba(77, 163, 255, 0.15)' },
  completed: { label: 'Completed', color: '#35C759', bg: 'rgba(53, 199, 89, 0.15)' },
  cancelled: { label: 'Cancelled', color: '#8D969B', bg: 'rgba(141, 150, 155, 0.15)' },
};

export const getStatusConfig = (status: string) => {
  return STATUS_CONFIG[status] || STATUS_CONFIG.open;
};
