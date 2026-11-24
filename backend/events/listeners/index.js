const notificationListeners = require('./notificationListeners');
const realtimeListeners = require('./realtimeListeners');

let registered = false;

// Called once at startup (server.js). Safe to call more than once.
function registerListeners() {
  if (registered) return;
  notificationListeners.register();
  realtimeListeners.register();
  registered = true;
}

module.exports = { registerListeners };
