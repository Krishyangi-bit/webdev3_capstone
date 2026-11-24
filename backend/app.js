const express = require('express');
const mongoose = require('mongoose');

const requestLogger = require('./middleware/requestLogger');
const { cookieParser } = require('./middleware/cookieParser');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 'loopback');

// Global middleware chain
app.use(requestLogger);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser);

// Health check - reports API and database state.
app.get('/api/health', (req, res) => {
  const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.status(200).json({
    success: true,
    message: 'CampusFix API is running',
    data: {
      uptimeSeconds: Math.round(process.uptime()),
      database: dbStates[mongoose.connection.readyState] || 'unknown',
    },
  });
});

// API routes
app.use('/api/auth', authRoutes);

// 404 for unknown API routes, then the central error handler.
app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
