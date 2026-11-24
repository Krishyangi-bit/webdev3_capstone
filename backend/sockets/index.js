const { Server } = require('socket.io');
const env = require('../config/env');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const { verifyAccessToken } = require('../services/tokenService');
const { canUserViewComplaint } = require('../services/complaintAccess');

/*
 * Rooms:
 *   user:<id>         every socket of one user (personal notifications)
 *   role:admin        all administrators (new complaints, list refreshes)
 *   complaint:<id>    people viewing a complaint they are allowed to see
 *                     (live comments and status changes)
 */

let io = null;

async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) return next(new Error('Account unavailable'));
    socket.data.user = { id: String(user._id), role: user.role, name: user.name };
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
}

function handleConnection(socket) {
  const { user } = socket.data;
  socket.join(`user:${user.id}`);
  socket.join(`role:${user.role}`);

  socket.on('complaint:join', async (complaintId, ack = () => {}) => {
    try {
      const complaint = await Complaint.findById(complaintId).select('reportedBy assignedTo');
      if (!complaint || !(await canUserViewComplaint(user, complaint))) {
        return ack({ ok: false, message: 'Not allowed' });
      }
      socket.join(`complaint:${complaintId}`);
      ack({ ok: true });
    } catch {
      ack({ ok: false, message: 'Invalid complaint' });
    }
  });

  socket.on('complaint:leave', (complaintId) => {
    socket.leave(`complaint:${complaintId}`);
  });
}

function initSocket(httpServer) {
  io = new Server(httpServer, {
    // The React dev server proxies /socket.io, so same-origin requests need no CORS.
    // CLIENT_URL is allowed for setups that connect to the API directly.
    cors: { origin: env.clientUrl, credentials: true },
  });
  io.use(authenticateSocket);
  io.on('connection', handleConnection);
  return io;
}

// Emit helpers are no-ops when sockets are not initialised (seed scripts, tests).
function emitToUser(userId, event, payload) {
  if (io && userId) io.to(`user:${userId}`).emit(event, payload);
}

function emitToRole(role, event, payload) {
  if (io) io.to(`role:${role}`).emit(event, payload);
}

function emitToComplaint(complaintId, event, payload) {
  if (io) io.to(`complaint:${complaintId}`).emit(event, payload);
}

function disconnectUser(userId) {
  if (io) io.in(`user:${userId}`).disconnectSockets(true);
}

module.exports = { initSocket, emitToUser, emitToRole, emitToComplaint, disconnectUser };
