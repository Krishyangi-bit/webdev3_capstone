const express = require('express');
const mongoose = require('mongoose');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

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

module.exports = app;
