import { io } from 'socket.io-client';
import { getAccessToken, refreshSession } from './api';

// Creates the authenticated Socket.IO connection. `auth` is a function so
// every (re)connection uses the current access token, which rotates.
export function createSocket() {
  const socket = io({
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: (cb) => cb({ token: getAccessToken() }),
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });

  // The server rejects expired tokens; refresh once and try again.
  socket.on('connect_error', async (err) => {
    if (!/expired|invalid/i.test(err.message)) return;
    try {
      await refreshSession();
      socket.connect();
    } catch {
      // Session is gone; AuthContext will route back to sign-in on the next API call.
    }
  });

  return socket;
}
