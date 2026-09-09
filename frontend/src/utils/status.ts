export const STATUS_CONFIG = {
  // Risk levels
  low: {
    label: 'Low',
    color: 'text-green-400',
    dot: 'bg-green-400',
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-400',
    dot: 'bg-yellow-400',
  },
  high: {
    label: 'High',
    color: 'text-orange-400',
    dot: 'bg-orange-400',
  },
  critical: {
    label: 'Critical',
    color: 'text-red-400',
    dot: 'bg-red-400',
  },

  // Statuses
  open: {
    label: 'Open',
    color: 'text-blue-400',
    dot: 'bg-blue-400',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-yellow-400',
    dot: 'bg-yellow-400',
  },
  resolved: {
    label: 'Resolved',
    color: 'text-green-400',
    dot: 'bg-green-400',
  },
  closed: {
    label: 'Closed',
    color: 'text-gray-400',
    dot: 'bg-gray-400',
  },
  assigned: {
    label: 'Assigned',
    color: 'text-purple-400',
    dot: 'bg-purple-400',
  },
  reported: {
    label: 'Reported',
    color: 'text-orange-400',
    dot: 'bg-orange-400',
  },
  verified: {
    label: 'Verified',
    color: 'text-green-400',
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
    color: 'text-red-400',
    dot: 'bg-red-400',
  },
  pending: {
    label: 'Pending',
    color: 'text-yellow-400',
    dot: 'bg-yellow-400',
  },
  overdue: {
    label: 'Overdue',
    color: 'text-red-400',
    dot: 'bg-red-400',
  },

  // Alert / incident workflow statuses
  acknowledged: {
    label: 'Acknowledged',
    color: 'text-blue-400',
    dot: 'bg-blue-400',
  },
  escalated: {
    label: 'Escalated',
    color: 'text-purple-400',
    dot: 'bg-purple-400',
  },
  investigating: {
    label: 'Investigating',
    color: 'text-yellow-400',
    dot: 'bg-yellow-400',
  },

  // Neutral informational
  info: {
    label: 'Info',
    color: 'text-gray-400',
    dot: 'bg-gray-400',
  },

  // Mine statuses
  active: {
    label: 'Active',
    color: 'text-green-400',
    dot: 'bg-green-400',
  },
  inactive: {
    label: 'Inactive',
    color: 'text-gray-400',
    dot: 'bg-gray-400',
  },
  maintenance: {
    label: 'Maintenance',
    color: 'text-yellow-400',
    dot: 'bg-yellow-400',
  },

  // Inspection statuses
  scheduled: {
    label: 'Scheduled',
    color: 'text-blue-400',
    dot: 'bg-blue-400',
  },
  completed: {
    label: 'Completed',
    color: 'text-green-400',
    dot: 'bg-green-400',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-gray-400',
    dot: 'bg-gray-400',
  },
} as const;

export type StatusKey = keyof typeof STATUS_CONFIG;

export const getStatusConfig = (status: string) => {
  return STATUS_CONFIG[status as StatusKey] || STATUS_CONFIG.open;
};