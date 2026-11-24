const env = require('../config/env');

// Logs one line per request once the response has been sent:
//   [api] POST /api/auth/login 200 34ms
function requestLogger(req, res, next) {
  if (env.nodeEnv === 'test') return next();

  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const userTag = req.user ? ` user=${req.user.id}` : '';
    console.log(`[api] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(0)}ms${userTag}`);
  });
  next();
}

module.exports = requestLogger;
