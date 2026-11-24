const { complaintEvents, COMPLAINT_EVENTS: E } = require('../complaintEvents');
const { emitToUser, emitToRole, emitToComplaint } = require('../../sockets');
const { ROLES } = require('../../utils/constants');

// Pushes lightweight "something changed" signals so open pages refresh
// without a reload. Payloads carry ids and status only; clients re-fetch the
// details through the authorised REST API.

const id = (value) => (value ? String(value._id ?? value) : null);

function broadcastComplaintChange(eventName) {
  return ({ complaint, previousStaffId }) => {
    const payload = {
      event: eventName,
      complaintId: String(complaint._id),
      complaintCode: complaint.complaintCode,
      status: complaint.status,
    };
    emitToComplaint(payload.complaintId, 'complaint:updated', payload);
    emitToRole(ROLES.ADMIN, 'complaint:updated', payload);
    emitToUser(id(complaint.reportedBy), 'complaint:updated', payload);
    emitToUser(id(complaint.assignedTo), 'complaint:updated', payload);
    if (previousStaffId) emitToUser(previousStaffId, 'complaint:updated', payload);
  };
}

function register() {
  const statusEvents = [E.CREATED, E.ASSIGNED, E.ACCEPTED, E.REJECTED, E.STATUS_UPDATED, E.RESOLVED, E.REOPENED, E.CLOSED, E.FEEDBACK_SUBMITTED];
  for (const eventName of statusEvents) {
    complaintEvents.on(eventName, broadcastComplaintChange(eventName));
  }

  // Live comments go only to sockets that joined this complaint's room
  // (joining is permission-checked in sockets/index.js).
  complaintEvents.on(E.COMMENT_ADDED, ({ complaint, comment }) => {
    emitToComplaint(String(complaint._id), 'comment:new', comment.toJSON());
  });
}

module.exports = { register };
