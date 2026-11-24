import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createSocket } from '../services/socket';
import { getUnreadCount } from '../services/notificationService';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { complaintPath } from '../utils/format';

const SocketContext = createContext({ socket: null, connected: false, unreadCount: 0 });

// Owns the real-time connection for the signed-in user: unread notification
// count, live toasts and the socket other components subscribe to.
export function SocketProvider({ children }) {
  const { user, status } = useAuth();
  const toast = useToast();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationVersion, setNotificationVersion] = useState(0);

  const refreshUnread = useCallback(() => {
    getUnreadCount()
      .then(setUnreadCount)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return undefined;
    const instance = createSocket();
    setSocket(instance);
    instance.on('connect', () => setConnected(true));
    instance.on('disconnect', () => setConnected(false));
    refreshUnread();
    return () => {
      instance.removeAllListeners();
      instance.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [status, user?._id, refreshUnread]);

  useEffect(() => {
    if (!socket || !user) return undefined;
    const onNotification = (notification) => {
      setUnreadCount((n) => n + 1);
      setNotificationVersion((v) => v + 1);
      toast.notify({
        title: notification.title,
        message: notification.message,
        link: notification.relatedComplaint ? complaintPath(user.role, notification.relatedComplaint) : undefined,
        linkLabel: 'Open complaint',
      });
    };
    socket.on('notification:new', onNotification);
    return () => socket.off('notification:new', onNotification);
  }, [socket, user, toast]);

  const value = useMemo(
    () => ({ socket, connected, unreadCount, setUnreadCount, refreshUnread, notificationVersion }),
    [socket, connected, unreadCount, refreshUnread, notificationVersion]
  );
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
