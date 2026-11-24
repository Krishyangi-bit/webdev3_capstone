const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const ISSUER = 'campusfix-api';

function signAccessToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
    issuer: ISSUER,
  });
}

// Each refresh token carries a random jti so two tokens issued in the same
// second are still different (and hash differently).
function signRefreshToken(user) {
  const token = jwt.sign({ sub: String(user._id), jti: crypto.randomUUID() }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
    issuer: ISSUER,
  });
  const { exp } = jwt.decode(token);
  return { token, expiresAt: new Date(exp * 1000) };
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret, { issuer: ISSUER });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret, { issuer: ISSUER });
}

// Refresh tokens are stored as SHA-256 hashes, so a database leak does not
// expose usable tokens.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, hashToken };
