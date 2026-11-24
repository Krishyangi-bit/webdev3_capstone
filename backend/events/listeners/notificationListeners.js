const { complaintEvents, COMPLAINT_EVENTS: E } = require('../complaintEvents');
const { notifyUsers, getActiveAdminIds } = require('../../services/notificationService');
const { ROLES } = require('../../utils/constants');

// Turns complaint events into stored notifications for the right people.
// notifyUsers also pushes each notification to the recipient over Socket.IO.

const id = (value) => (value ? String(value._id ?? value) : null);
const label = (c) => `${c.complaintCode} "${c.title}"`;

function register() {
  complaintEvents.onAsync(E.CREATED, async ({ complaint, actor }) => {
    await notifyUsers(await getActiveAdminIds(), {
      title: `New ${complaint.priority.toLowerCase()} priority complaint`,
      message: `${actor.name} reported ${label(complaint)} in ${complaint.building}.`,
      type: 'complaint_created',
      complaintId: complaint._id,
    });
  });

  complaintEvents.onAsync(E.ASSIGNED, async ({ complaint, staff, previousStaffId }) => {
    const where = [complaint.building, complaint.floor && `Floor ${complaint.floor}`, complaint.roomNumber && `Room ${complaint.roomNumber}`]
      .filter(Boolean)
      .join(', ');
    await notifyUsers([staff.id], {
      title: 'New task assigned to you',
      message: `${label(complaint)} at ${where}. Please accept or decline the assignment.`,
      type: 'complaint_assigned',
      complaintId: complaint._id,
    });
    await notifyUsers([id(complaint.reportedBy)], {
      title: 'Your complaint has been assigned',
      message: `${complaint.complaintCode} has been assigned to ${staff.name}.`,
      type: 'complaint_assigned',
      complaintId: complaint._id,
    });
    if (previousStaffId && previousStaffId !== staff.id) {
      await notifyUsers([previousStaffId], {
        title: 'Task reassigned',
        message: `${label(complaint)} has been reassigned to another staff member.`,
        type: 'complaint_assigned',
        complaintId: complaint._id,
      });
    }
  });

  complaintEvents.onAsync(E.ACCEPTED, async ({ complaint, assignment, actor }) => {
    await notifyUsers([id(complaint.reportedBy)], {
      title: 'Maintenance accepted your complaint',
      message: `${actor.name} accepted ${complaint.complaintCode} and will start work shortly.`,
      type: 'assignment_accepted',
      complaintId: complaint._id,
    });
    await notifyUsers([id(assignment.assignedBy)], {
      title: 'Assignment accepted',
      message: `${actor.name} accepted ${label(complaint)}.`,
      type: 'assignment_accepted',
      complaintId: complaint._id,
    });
  });

  complaintEvents.onAsync(E.REJECTED, async ({ complaint, actor, reason }) => {
    await notifyUsers(await getActiveAdminIds(), {
      title: 'Assignment declined - needs reassignment',
      message: `${actor.name} declined ${label(complaint)}: ${reason}`,
      type: 'assignment_rejected',
      complaintId: complaint._id,
    });
  });

  complaintEvents.onAsync(E.STATUS_UPDATED, async ({ complaint, actor, remarks }) => {
    await notifyUsers([id(complaint.reportedBy)], {
      title: `Work is ${complaint.status.toLowerCase()}`,
      message: `${actor.name} updated ${complaint.complaintCode} to ${complaint.status}${remarks ? `: ${remarks}` : '.'}`,
      type: 'status_updated',
      complaintId: complaint._id,
    });
  });

  complaintEvents.onAsync(E.RESOLVED, async ({ complaint, actor }) => {
    await notifyUsers([id(complaint.reportedBy)], {
      title: 'Your complaint has been resolved',
      message: `${actor.name} resolved ${complaint.complaintCode}. Confirm the fix with feedback, or reopen it if the problem persists.`,
      type: 'complaint_resolved',
      complaintId: complaint._id,
    });
    await notifyUsers(await getActiveAdminIds(), {
      title: 'Complaint resolved',
      message: `${actor.name} resolved ${label(complaint)}.`,
      type: 'complaint_resolved',
      complaintId: complaint._id,
    });
  });

  complaintEvents.onAsync(E.REOPENED, async ({ complaint, actor, reason }) => {
    const message = `${actor.name} reopened ${label(complaint)}: ${reason}`;
    await notifyUsers([id(complaint.assignedTo)], {
      title: 'Complaint reopened by student',
      message,
      type: 'complaint_reopened',
      complaintId: complaint._id,
    });
    await notifyUsers(await getActiveAdminIds(), {
      title: 'Complaint reopened',
      message,
      type: 'complaint_reopened',
      complaintId: complaint._id,
    });
  });

  complaintEvents.onAsync(E.CLOSED, async ({ complaint, actor, reason }) => {
    const recipients = [id(complaint.assignedTo)];
    if (actor.role === ROLES.ADMIN) recipients.push(id(complaint.reportedBy));
    await notifyUsers(
      recipients.filter((r) => r !== actor.id),
      {
        title: 'Complaint closed',
        message: `${complaint.complaintCode} was closed by ${actor.name}${reason ? `: ${reason}` : '.'}`,
        type: 'complaint_closed',
        complaintId: complaint._id,
      }
    );
  });

  complaintEvents.onAsync(E.COMMENT_ADDED, async ({ complaint, comment, actor }) => {
    const recipients = [id(complaint.reportedBy), id(complaint.assignedTo)].filter((r) => r && r !== actor.id);
    const preview = comment.message.length > 120 ? `${comment.message.slice(0, 117)}...` : comment.message;
    await notifyUsers(recipients, {
      title: `New comment on ${complaint.complaintCode}`,
      message: `${actor.name}: ${preview}`,
      type: 'comment_added',
      complaintId: complaint._id,
    });
  });

  complaintEvents.onAsync(E.FEEDBACK_SUBMITTED, async ({ complaint, actor, rating }) => {
    await notifyUsers([id(complaint.assignedTo)], {
      title: 'Feedback received',
      message: `${actor.name} rated your work on ${complaint.complaintCode} ${rating}/5.`,
      type: 'feedback_received',
      complaintId: complaint._id,
    });
  });
}

module.exports = { register };
