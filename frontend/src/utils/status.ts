export const STATUS_CONFIG = {
  // Risk levels
  low: {
    label: 'Low',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    dot: 'bg-green-400',
  },
  medium: {
    label: 'Medium',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    dot: 'bg-yellow-400',
  },
  high: {
    label: 'High',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    dot: 'bg-orange-400',
  },
  critical: {
    label: 'Critical',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    dot: 'bg-red-400',
  },

  // Statuses
  open: {
    label: 'Open',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    dot: 'bg-blue-400',
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    dot: 'bg-yellow-400',
  },
  resolved: {
    label: 'Resolved',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    dot: 'bg-green-400',
  },
  closed: {
    label: 'Closed',
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    dot: 'bg-gray-400',
  },
  assigned: {
    label: 'Assigned',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    dot: 'bg-purple-400',
  },
  reported: {
    label: 'Reported',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    dot: 'bg-orange-400',
  },
  verified: {
    label: 'Verified',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    dot: 'bg-green-400',
  },

  // Compliance statuses
  compliant: {
    label: 'Compliant',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    dot: 'bg-green-400',
  },
  non_compliant: {
    label: 'Non-Compliant',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    dot: 'bg-red-400',
  },
  pending: {
    label: 'Pending',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    dot: 'bg-yellow-400',
  },
  overdue: {
    label: 'Overdue',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    dot: 'bg-red-400',
  },

  // Mine statuses
  active: {
    label: 'Active',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    dot: 'bg-green-400',
  },
  inactive: {
    label: 'Inactive',
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    dot: 'bg-gray-400',
  },
  maintenance: {
    label: 'Maintenance',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    dot: 'bg-yellow-400',
  },

  // Inspection statuses
  scheduled: {
    label: 'Scheduled',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    dot: 'bg-blue-400',
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    dot: 'bg-green-400',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    dot: 'bg-gray-400',
  },
} as const;

export type StatusKey = keyof typeof STATUS_CONFIG;

export const getStatusConfig = (status: string) => {
  return STATUS_CONFIG[status as StatusKey] || STATUS_CONFIG.open;
};