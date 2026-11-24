import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

// Subscribes to a Socket.IO event for the lifetime of the component.
// The latest handler is always used without re-subscribing.
export function useSocketEvent(event, handler) {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket) return undefined;
    const listener = (payload) => handlerRef.current(payload);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [socket, event]);
}

// Re-runs `reload` when any complaint changes (optionally only one complaint).
// Bursts of events are collapsed into one reload.
export function useComplaintUpdates(reload, complaintId) {
  const timer = useRef(null);
  useSocketEvent('complaint:updated', (payload) => {
    if (complaintId && payload.complaintId !== complaintId) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(reload, 250);
  });
  useEffect(() => () => clearTimeout(timer.current), []);
}
