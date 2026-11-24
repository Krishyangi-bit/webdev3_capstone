import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Pagination from '../../components/Pagination';
import { Tabs } from '../../components/FormControls';
import { NotificationList, useOpenNotification } from '../../components/NotificationPanel';
import { LoadingState, ErrorState, EmptyState } from '../../components/States';
import { useSocket } from '../../context/SocketContext';
import { useAsync } from '../../hooks/useAsync';
import { getNotifications, markAllNotificationsRead } from '../../services/notificationService';

export default function NotificationsPage() {
  const [params, setParams] = useSearchParams();
  const unreadOnly = params.get('filter') === 'unread';
  const page = Number(params.get('page')) || 1;
  const { unreadCount, setUnreadCount, notificationVersion } = useSocket();

  const result = useAsync(() => getNotifications({ unread: unreadOnly, page, limit: 20 }), [unreadOnly, page, notificationVersion]);
  const markLocalRead = (id) =>
    result.setData((res) => ({
      ...res,
      data: { notifications: res.data.notifications.map((n) => (n._id === id ? { ...n, isRead: true } : n)) },
    }));
  const openNotification = useOpenNotification(markLocalRead);

  async function markAll() {
    await markAllNotificationsRead();
    setUnreadCount(0);
    result.reload();
  }

  return (
    <div className="notifications-page">
      <PageHeader
        title="Notifications"
        description="Updates about complaints you reported, were assigned or manage."
        actions={
          unreadCount > 0 && (
            <Button variant="secondary" icon="check" onClick={markAll}>
              Mark all as read
            </Button>
          )
        }
      />
      <Tabs
        label="Filter"
        tabs={[
          { value: 'all', label: 'All' },
          { value: 'unread', label: `Unread${unreadCount ? ` (${unreadCount})` : ''}` },
        ]}
        value={unreadOnly ? 'unread' : 'all'}
        onChange={(v) => setParams(v === 'unread' ? { filter: 'unread' } : {})}
      />

      {result.loading ? (
        <div className="panel">
          <LoadingState rows={6} />
        </div>
      ) : result.error ? (
        <ErrorState error={result.error} onRetry={result.reload} />
      ) : result.data.data.notifications.length === 0 ? (
        <div className="panel">
          <EmptyState icon="bell" title={unreadOnly ? 'No unread notifications' : 'No notifications yet'} text="You'll be notified here when something happens on your complaints." />
        </div>
      ) : (
        <div className="panel">
          <NotificationList notifications={result.data.data.notifications} onOpen={openNotification} />
          <Pagination
            meta={result.data.meta}
            onPageChange={(p) => {
              const next = new URLSearchParams(params);
              next.set('page', String(p));
              setParams(next);
            }}
          />
        </div>
      )}
    </div>
  );
}
