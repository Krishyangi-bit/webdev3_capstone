import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import Button from './Button';
import { LoadingState, EmptyState, ErrorState } from './States';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../services/notificationService';
import { complaintPath, timeAgo } from '../utils/format';

export function NotificationList({ notifications, onOpen }) {
  return (
    <ul className="notification-list">
      {notifications.map((n) => (
        <li key={n._id}>
          <button type="button" className={`notification-item ${n.isRead ? '' : 'is-unread'}`} onClick={() => onOpen(n)}>
            <span className="notification-item__dot" aria-hidden="true" />
            <span>
              <span className="notification-item__title">
                {!n.isRead && <span className="visually-hidden">Unread: </span>}
                {n.title}
              </span>
              <span className="notification-item__message">{n.message}</span>
              {n.relatedComplaint?.complaintCode && <span className="notification-item__link">{n.relatedComplaint.complaintCode}</span>}
            </span>
            <time className="notification-item__time" dateTime={n.createdAt}>
              {timeAgo(n.createdAt)}
            </time>
          </button>
        </li>
      ))}
    </ul>
  );
}

// Shared open handler: mark as read, then go to the complaint.
export function useOpenNotification(onRead) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setUnreadCount } = useSocket();

  return async (notification) => {
    if (!notification.isRead) {
      onRead?.(notification._id);
      setUnreadCount((n) => Math.max(0, n - 1));
      markNotificationRead(notification._id).catch(() => {});
    }
    const complaintId = notification.relatedComplaint?._id || notification.relatedComplaint;
    if (complaintId) navigate(complaintPath(user.role, complaintId));
  };
}

// Bell button in the top bar with a dropdown of recent notifications.
export default function NotificationPanel() {
  const { user } = useAuth();
  const { unreadCount, setUnreadCount, notificationVersion } = useSocket();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ items: [], loading: false, error: null });
  const wrapperRef = useRef(null);

  const markLocalRead = (id) =>
    setState((s) => ({ ...s, items: s.items.map((n) => (n._id === id ? { ...n, isRead: true } : n)) }));
  const openNotification = useOpenNotification(markLocalRead);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setState((s) => ({ ...s, loading: s.items.length === 0, error: null }));
    getNotifications({ limit: 8 })
      .then((res) => active && setState({ items: res.data.notifications, loading: false, error: null }))
      .catch((error) => active && setState((s) => ({ ...s, loading: false, error })));
    return () => {
      active = false;
    };
  }, [open, notificationVersion]);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function markAll() {
    await markAllNotificationsRead();
    setUnreadCount(0);
    setState((s) => ({ ...s, items: s.items.map((n) => ({ ...n, isRead: true })) }));
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn--ghost btn--icon icon-button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="bell" size={18} />
        {unreadCount > 0 && <span className="icon-button__dot">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="popover" role="dialog" aria-label="Notifications">
          <div className="popover__header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAll}>
                Mark all read
              </Button>
            )}
          </div>
          {state.loading && <LoadingState rows={3} />}
          {state.error && <ErrorState compact error={state.error} />}
          {!state.loading && !state.error && state.items.length === 0 && (
            <EmptyState compact icon="bell" title="You're all caught up" text="Updates about your complaints will appear here." />
          )}
          {state.items.length > 0 && (
            <NotificationList
              notifications={state.items}
              onOpen={(n) => {
                setOpen(false);
                openNotification(n);
              }}
            />
          )}
          <div className="popover__footer">
            <Link to={`/${user.role}/notifications`} onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
