const { EventEmitter } = require('events');

/*
 * Application event bus for complaint activity.
 *
 * Services emit an event after a change has been saved; listeners in
 * ./listeners react to it (create notifications, push Socket.IO updates).
 * This keeps side effects out of controllers and services: adding a new
 * reaction to an event means adding a listener, not editing business logic.
 */

const COMPLAINT_EVENTS = Object.freeze({
  CREATED: 'complaintCreated',
  ASSIGNED: 'complaintAssigned',
  ACCEPTED: 'complaintAccepted',
  REJECTED: 'assignmentRejected',
  STATUS_UPDATED: 'complaintStatusUpdated',
  RESOLVED: 'complaintResolved',
  REOPENED: 'complaintReopened',
  CLOSED: 'complaintClosed',
  COMMENT_ADDED: 'commentAdded',
  FEEDBACK_SUBMITTED: 'feedbackSubmitted',
});

class ComplaintEventBus extends EventEmitter {
  // Listeners are often async; an unhandled rejection inside one must not
  // crash the process or affect the HTTP response that triggered it.
  onAsync(eventName, handler) {
    this.on(eventName, (payload) => {
      Promise.resolve()
        .then(() => handler(payload))
        .catch((err) => console.error(`[events] Listener for "${eventName}" failed:`, err));
    });
  }
}

const complaintEvents = new ComplaintEventBus();
complaintEvents.setMaxListeners(30);

module.exports = { complaintEvents, COMPLAINT_EVENTS };
