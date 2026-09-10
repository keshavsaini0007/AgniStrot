import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '@/hooks/useNotifications';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { PageHeader } from '@/components/layout/PageHeader';
import notificationsHeaderImg from '../../../assets/images/Notifications.png';

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
      <PageHeader
        title="Notifications"
        subtitle="View and manage notifications"
        backgroundImage={notificationsHeaderImg}
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleMarkAllAsRead}
              isLoading={markAllAsRead.isPending}
            >
              Mark All as Read
            </Button>
          </div>
        }
      />

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
              {data?.data.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
