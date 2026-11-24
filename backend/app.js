const path = require('path');
const express = require('express');
const mongoose = require('mongoose');

const requestLogger = require('./middleware/requestLogger');
const { cookieParser } = require('./middleware/cookieParser');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { UPLOAD_ROOT } = require('./utils/imageStorage');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 'loopback');

// Basic security headers on every response.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

// Global middleware chain
app.use(requestLogger);
// Complaint creation carries up to three base64 images, so it gets a larger
// body limit. Every other route keeps the 1 MB default.
app.post('/api/complaints', express.json({ limit: '8mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser);

// Uploaded complaint images (random, unguessable file names).
app.use('/uploads', express.static(UPLOAD_ROOT, { fallthrough: false, maxAge: '7d', index: false }));

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
app.use('/api/users', userRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/staff', assignmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 for unknown API routes, then the central error handler.
app.use('/api', notFound);

// In production the built React app is served by Express.
const clientDist = path.resolve(__dirname, '..', 'frontend', 'dist');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api|uploads|socket\.io).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(errorHandler);

module.exports = app;
