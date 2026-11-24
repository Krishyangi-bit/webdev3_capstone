const mongoose = require('mongoose');
const env = require('./env');

mongoose.connection.on('disconnected', () => console.warn('[db] MongoDB disconnected'));
mongoose.connection.on('reconnected', () => console.log('[db] MongoDB reconnected'));
mongoose.connection.on('error', (err) => console.error('[db] MongoDB error:', err.message));

async function connectDatabase(uri = env.mongoUri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const { host, port, name } = mongoose.connection;
  console.log(`[db] Connected to MongoDB at ${host}:${port}/${name}`);
  return mongoose.connection;
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };
