const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../services/tokenService');

// Verifies the Bearer access token and loads the current user on req.user.
// The user is re-read from the database on every request so deactivating an
// account takes effect immediately, even while its access token is still valid.
async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized('Authentication required', 'TOKEN_MISSING');
  }

  const payload = verifyAccessToken(token); // throws TokenExpiredError / JsonWebTokenError
  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('Account no longer exists', 'TOKEN_INVALID');
  if (!user.isActive) throw ApiError.forbidden('Your account has been deactivated. Contact the administrator.');

  req.user = { id: String(user._id), role: user.role, name: user.name, email: user.email, doc: user };
  next();
}

// Role-based access control: authorize('admin'), authorize('staff', 'admin').
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('Your role does not have access to this resource'));
    }
    next();
  };
}

module.exports = { authenticate, authorize };
