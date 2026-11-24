const mongoose = require('mongoose');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Translate known library errors into ApiErrors so clients always receive
// { success: false, message } with a meaningful status code.
function normalizeError(err) {
  if (err instanceof ApiError) return err;

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return ApiError.badRequest(details[0]?.message || 'Validation failed', details);
  }
  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid value for ${err.path}`);
  }
  if (err && err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return ApiError.conflict(`An account or record with this ${field} already exists`);
  }
  if (err && err.type === 'entity.parse.failed') {
    return ApiError.badRequest('Request body is not valid JSON');
  }
  if (err && err.type === 'entity.too.large') {
    return new ApiError(413, 'Request body is too large. Images must be under 2 MB each.');
  }
  if (err && err.name === 'TokenExpiredError') {
    return ApiError.unauthorized('Session expired', 'TOKEN_EXPIRED');
  }
  if (err && err.name === 'JsonWebTokenError') {
    return ApiError.unauthorized('Invalid token', 'TOKEN_INVALID');
  }
  return null;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const apiError = normalizeError(err);

  if (!apiError) {
    console.error('[error]', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong on our side. Please try again.',
      ...(env.isProduction ? {} : { error: err.message }),
    });
  }

  const body = { success: false, message: apiError.message };
  if (apiError.code) body.code = apiError.code;
  if (apiError.details) body.errors = apiError.details;
  return res.status(apiError.statusCode).json(body);
}

module.exports = { notFound, errorHandler };
