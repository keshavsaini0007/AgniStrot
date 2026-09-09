import { Badge } from '@/components/ui/Badge';
import { formatRelativeTime } from '@/utils/date';
import type { Notification } from '@/types';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

export const NotificationItem = ({ notification, onMarkAsRead }: NotificationItemProps) => (
  <div
    className={`px-6 py-4 hover:bg-[#171A1D] transition-colors cursor-pointer ${
      !notification.read ? 'bg-[#171A1D]/50' : ''
    }`}
    onClick={() => !notification.read && onMarkAsRead(notification.id)}
  >
    <div className="flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium text-[#F4F5F5]">
            {notification.title}
          </p>
          {!notification.read && (
            <span className="w-2 h-2 bg-[#D88A32] rounded-full" />
          )}
        </div>
        <p className="text-sm text-[#A4ADB2]">{notification.message}</p>
        <p className="text-xs text-[#8D969B] mt-1">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
      <Badge status={notification.severity} />
    </div>
  </div>
);
