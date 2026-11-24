const http = require('http');
const env = require('./config/env');
const app = require('./app');
const { connectDatabase, disconnectDatabase } = require('./config/db');
const { initSocket } = require('./sockets');
const { registerListeners } = require('./events/listeners');

const server = http.createServer(app);
initSocket(server);
registerListeners();

server.on('error', async (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[server] Port ${env.port} is already in use. Set a different PORT in backend/.env.`);
  } else {
    console.error('[server] HTTP server error:', err.message);
  }
  await disconnectDatabase();
  process.exit(1);
});

async function start() {
  try {
    await connectDatabase();
    server.listen(env.port, () => {
      console.log(`[server] CampusFix API listening on http://localhost:${env.port} (${env.nodeEnv})`);
    });
  } catch (err) {
    console.error('[server] Failed to start:', err.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down`);
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
  // Force exit if connections do not close in time.
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason);
});

start();
