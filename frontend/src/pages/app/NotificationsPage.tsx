import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '@/hooks/useNotifications';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRelativeTime } from '@/utils/date';
import type { Notification } from '@/types';

export const NotificationsPage = () => {
  const { data, isLoading, error, refetch } = useNotifications({ limit: 20 });
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const handleMarkAsRead = (id: string) => {
    markAsRead.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  if (error) {
    return <ErrorState onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F4F5F5]">Notifications</h1>
          <p className="text-[#8D969B]">View and manage notifications</p>
        </div>
        <Button
          variant="secondary"
          onClick={handleMarkAllAsRead}
          isLoading={markAllAsRead.isPending}
        >
          Mark All as Read
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={5} columns={1} />
            </div>
          ) : data?.data.length === 0 ? (
            <EmptyState
              title="No notifications"
              description="You're all caught up!"
            />
          ) : (
            <div className="divide-y divide-[#252A2D]">
              {data?.data.map((notification: Notification) => (
                <div
                  key={notification.id}
                  className={`px-6 py-4 hover:bg-[#171A1D] transition-colors cursor-pointer ${
                    !notification.read ? 'bg-[#171A1D]/50' : ''
                  }`}
                  onClick={() => !notification.read && handleMarkAsRead(notification.id)}
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};