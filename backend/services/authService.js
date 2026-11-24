const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { ROLES } = require('../utils/constants');
const tokenService = require('./tokenService');

const MAX_SESSIONS_PER_USER = 5;

async function issueSession(user, userAgent) {
  const accessToken = tokenService.signAccessToken(user);
  const refresh = tokenService.signRefreshToken(user);

  const now = Date.now();
  const sessions = (user.refreshSessions || []).filter((s) => s.expiresAt.getTime() > now);
  sessions.push({
    tokenHash: tokenService.hashToken(refresh.token),
    expiresAt: refresh.expiresAt,
    userAgent: (userAgent || '').slice(0, 300),
  });
  // Keep only the most recent sessions.
  user.refreshSessions = sessions.slice(-MAX_SESSIONS_PER_USER);
  await user.save();

  return { accessToken, refreshToken: refresh.token, refreshExpiresAt: refresh.expiresAt };
}

// Public registration always creates a student. Staff and admin accounts are
// created by administrators only.
async function registerStudent(input, userAgent) {
  const existing = await User.exists({ email: input.email });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const user = new User({ ...input, role: ROLES.STUDENT, isActive: true });
  await user.save();
  const fullUser = await User.findById(user._id).select('+refreshSessions');
  const session = await issueSession(fullUser, userAgent);
  return { user: fullUser, ...session };
}

async function login({ email, password }, userAgent) {
  const user = await User.findOne({ email }).select('+password +refreshSessions');
  // Same message for unknown email and wrong password: do not reveal which accounts exist.
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }
  if (!user.isActive) {
    throw ApiError.forbidden('Your account has been deactivated. Contact the administrator.');
  }
  user.lastLoginAt = new Date();
  const session = await issueSession(user, userAgent);
  return { user, ...session };
}

// Refresh-token rotation: the presented token is exchanged for a new one and
// invalidated. If a correctly-signed token is not in the session list it was
// already used, which suggests theft, so every session for the user is revoked.
async function refresh(refreshToken, userAgent) {
  if (!refreshToken) throw ApiError.unauthorized('No active session', 'REFRESH_MISSING');

  let payload;
  try {
    payload = tokenService.verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Session expired. Please sign in again.', 'REFRESH_INVALID');
  }

  const user = await User.findById(payload.sub).select('+refreshSessions');
  if (!user) throw ApiError.unauthorized('Session expired. Please sign in again.', 'REFRESH_INVALID');

  const tokenHash = tokenService.hashToken(refreshToken);
  const session = user.refreshSessions.find((s) => s.tokenHash === tokenHash);
  if (!session) {
    user.refreshSessions = [];
    await user.save();
    throw ApiError.unauthorized('Session is no longer valid. Please sign in again.', 'REFRESH_REUSED');
  }
  if (!user.isActive) {
    user.refreshSessions = [];
    await user.save();
    throw ApiError.forbidden('Your account has been deactivated. Contact the administrator.');
  }

  user.refreshSessions = user.refreshSessions.filter((s) => s.tokenHash !== tokenHash);
  const next = await issueSession(user, userAgent);
  return { user, ...next };
}

async function logout(refreshToken) {
  if (!refreshToken) return;
  let payload;
  try {
    payload = tokenService.verifyRefreshToken(refreshToken);
  } catch {
    return; // Expired or tampered token: nothing to revoke.
  }
  const tokenHash = tokenService.hashToken(refreshToken);
  await User.updateOne({ _id: payload.sub }, { $pull: { refreshSessions: { tokenHash } } });
}

module.exports = { registerStudent, login, refresh, logout };
