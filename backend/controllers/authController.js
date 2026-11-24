const env = require('../config/env');
const authService = require('../services/authService');
const { sendSuccess } = require('../utils/apiResponse');

const REFRESH_COOKIE = 'cf_refresh';

// The refresh token lives only in an HttpOnly cookie scoped to /api/auth:
// JavaScript cannot read it and it is not sent with other API requests.
function setRefreshCookie(res, token, expiresAt) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    path: '/api/auth',
    expires: expiresAt,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, secure: env.isProduction, sameSite: 'strict', path: '/api/auth' });
}

function sessionResponse(res, status, message, { user, accessToken, refreshToken, refreshExpiresAt }) {
  setRefreshCookie(res, refreshToken, refreshExpiresAt);
  return sendSuccess(res, { status, message, data: { user, accessToken } });
}

async function register(req, res) {
  const result = await authService.registerStudent(req.body, req.headers['user-agent']);
  return sessionResponse(res, 201, 'Account created successfully', result);
}

async function login(req, res) {
  const result = await authService.login(req.body, req.headers['user-agent']);
  return sessionResponse(res, 200, 'Signed in successfully', result);
}

async function refresh(req, res) {
  try {
    const result = await authService.refresh(req.cookies[REFRESH_COOKIE], req.headers['user-agent']);
    return sessionResponse(res, 200, 'Session refreshed', result);
  } catch (err) {
    clearRefreshCookie(res);
    throw err;
  }
}

async function logout(req, res) {
  await authService.logout(req.cookies[REFRESH_COOKIE]);
  clearRefreshCookie(res);
  return sendSuccess(res, { message: 'Signed out successfully' });
}

async function me(req, res) {
  return sendSuccess(res, { message: 'Current user', data: { user: req.user.doc } });
}

module.exports = { register, login, refresh, logout, me };
