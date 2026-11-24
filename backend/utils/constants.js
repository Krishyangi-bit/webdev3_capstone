// Domain constants shared by models, validators and services.

const ROLES = Object.freeze({
  STUDENT: 'student',
  STAFF: 'staff',
  ADMIN: 'admin',
});

const CATEGORIES = Object.freeze([
  'Electrical',
  'Plumbing',
  'Internet & Networking',
  'Furniture',
  'Equipment',
  'Cleanliness',
  'Hostel Maintenance',
  'Other',
]);

const PRIORITIES = Object.freeze(['Low', 'Medium', 'High', 'Critical']);

const STATUS = Object.freeze({
  SUBMITTED: 'Submitted',
  ASSIGNED: 'Assigned',
  ACCEPTED: 'Accepted',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  REOPENED: 'Reopened',
  CLOSED: 'Closed',
});

const STATUSES = Object.freeze(Object.values(STATUS));

// Every status a complaint may move to from its current status.
// Who may perform each move is enforced separately in the services.
const STATUS_TRANSITIONS = Object.freeze({
  [STATUS.SUBMITTED]: [STATUS.ASSIGNED, STATUS.CLOSED],
  [STATUS.ASSIGNED]: [STATUS.ACCEPTED, STATUS.SUBMITTED, STATUS.ASSIGNED],
  [STATUS.ACCEPTED]: [STATUS.IN_PROGRESS, STATUS.ASSIGNED],
  [STATUS.IN_PROGRESS]: [STATUS.RESOLVED, STATUS.ASSIGNED],
  [STATUS.RESOLVED]: [STATUS.CLOSED, STATUS.REOPENED],
  [STATUS.REOPENED]: [STATUS.IN_PROGRESS, STATUS.ASSIGNED, STATUS.CLOSED],
  [STATUS.CLOSED]: [],
});

// Statuses that still need work from the maintenance team.
const OPEN_STATUSES = Object.freeze([
  STATUS.SUBMITTED,
  STATUS.ASSIGNED,
  STATUS.ACCEPTED,
  STATUS.IN_PROGRESS,
  STATUS.REOPENED,
]);

// Target resolution time per priority. Open complaints older than this are overdue.
const SLA_HOURS = Object.freeze({
  Critical: 24,
  High: 48,
  Medium: 72,
  Low: 120,
});

const ASSIGNMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  REASSIGNED: 'reassigned',
});

const NOTIFICATION_TYPES = Object.freeze([
  'complaint_created',
  'complaint_assigned',
  'assignment_accepted',
  'assignment_rejected',
  'status_updated',
  'complaint_resolved',
  'complaint_reopened',
  'complaint_closed',
  'comment_added',
  'feedback_received',
  'account',
]);

const BUILDINGS = Object.freeze([
  'Academic Block A',
  'Academic Block B',
  'Engineering Labs',
  'Central Library',
  'Administrative Block',
  'Boys Hostel 1',
  'Boys Hostel 2',
  'Girls Hostel 1',
  'Cafeteria',
  'Sports Complex',
  'Auditorium',
]);

module.exports = {
  ROLES,
  CATEGORIES,
  PRIORITIES,
  STATUS,
  STATUSES,
  STATUS_TRANSITIONS,
  OPEN_STATUSES,
  SLA_HOURS,
  ASSIGNMENT_STATUS,
  NOTIFICATION_TYPES,
  BUILDINGS,
};
