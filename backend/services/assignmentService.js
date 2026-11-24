const mongoose = require('mongoose');
const Assignment = require('../models/Assignment');
const Complaint = require('../models/Complaint');
const ApiError = require('../utils/ApiError');
const { STATUS, ASSIGNMENT_STATUS, PRIORITIES } = require('../utils/constants');
const { getPagination, buildMeta } = require('../utils/pagination');
const { complaintEvents, COMPLAINT_EVENTS } = require('../events/complaintEvents');
const statusService = require('./statusService');
const { isOverdue, actorOf } = require('./complaintService');

const COMPLAINT_FIELDS =
  'complaintCode title description category priority status building block floor roomNumber location images createdAt updatedAt resolvedAt resolutionNotes feedback reportedBy assignedTo';

const VIEW_FILTERS = {
  pending: { assignmentStatus: ASSIGNMENT_STATUS.PENDING },
  active: { assignmentStatus: ASSIGNMENT_STATUS.ACCEPTED },
  completed: { assignmentStatus: ASSIGNMENT_STATUS.COMPLETED },
  current: { assignmentStatus: { $in: [ASSIGNMENT_STATUS.PENDING, ASSIGNMENT_STATUS.ACCEPTED] } },
  history: {
    assignmentStatus: { $in: [ASSIGNMENT_STATUS.COMPLETED, ASSIGNMENT_STATUS.REJECTED, ASSIGNMENT_STATUS.REASSIGNED] },
  },
};

function populateAssignment(query) {
  return query
    .populate({
      path: 'complaint',
      select: COMPLAINT_FIELDS,
      populate: { path: 'reportedBy', select: 'name department phone hostel' },
    })
    .populate('assignedBy', 'name');
}

function decorate(assignment) {
  const json = assignment.toJSON();
  if (json.complaint) json.complaint.isOverdue = isOverdue(json.complaint);
  return json;
}

const priorityWeight = (a) => PRIORITIES.indexOf(a.complaint?.priority);

async function listForStaff(user, { view = 'current', ...query }) {
  const pagination = getPagination(query);
  const filter = { assignedTo: user.id, ...(VIEW_FILTERS[view] || VIEW_FILTERS.current) };

  const [items, total] = await Promise.all([
    populateAssignment(Assignment.find(filter).sort({ assignedAt: -1 }).skip(pagination.skip).limit(pagination.limit)),
    Assignment.countDocuments(filter),
  ]);
  let decorated = items.map(decorate).filter((a) => a.complaint);
  if (view === 'current' || view === 'pending' || view === 'active') {
    decorated = decorated.sort((a, b) => priorityWeight(b) - priorityWeight(a));
  }
  return { items: decorated, meta: buildMeta(pagination, total) };
}

async function getOwnAssignment(user, assignmentId) {
  const assignment = await populateAssignment(Assignment.findById(assignmentId));
  if (!assignment) throw ApiError.notFound('Assignment not found');
  if (String(assignment.assignedTo) !== user.id) throw ApiError.forbidden('This assignment belongs to another staff member');
  return assignment;
}

async function getAssignment(user, assignmentId) {
  return decorate(await getOwnAssignment(user, assignmentId));
}

async function loadPendingForResponse(user, assignmentId) {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw ApiError.notFound('Assignment not found');
  if (String(assignment.assignedTo) !== user.id) throw ApiError.forbidden('This assignment belongs to another staff member');
  if (assignment.assignmentStatus !== ASSIGNMENT_STATUS.PENDING) {
    throw ApiError.unprocessable(`This assignment has already been ${assignment.assignmentStatus}`);
  }
  const complaint = await Complaint.findById(assignment.complaint);
  if (!complaint || String(complaint.assignedTo) !== user.id || complaint.status !== STATUS.ASSIGNED) {
    throw ApiError.unprocessable('This complaint is no longer waiting for your response');
  }
  return { assignment, complaint };
}

async function acceptAssignment(user, assignmentId, { remarks } = {}) {
  const { assignment, complaint } = await loadPendingForResponse(user, assignmentId);
  assignment.assignmentStatus = ASSIGNMENT_STATUS.ACCEPTED;
  assignment.acceptedAt = new Date();
  await assignment.save();
  await statusService.changeStatus(complaint, STATUS.ACCEPTED, user.id, remarks || `Accepted by ${user.name}`);

  complaintEvents.emit(COMPLAINT_EVENTS.ACCEPTED, { complaint, assignment, actor: actorOf(user) });
  return getAssignment(user, assignmentId);
}

// Declining returns the complaint to the admin queue as "Submitted".
async function rejectAssignment(user, assignmentId, { reason }) {
  const { assignment, complaint } = await loadPendingForResponse(user, assignmentId);
  assignment.assignmentStatus = ASSIGNMENT_STATUS.REJECTED;
  assignment.rejectedAt = new Date();
  assignment.responseNote = reason;
  await assignment.save();

  complaint.assignedTo = null;
  await statusService.changeStatus(complaint, STATUS.SUBMITTED, user.id, `Declined by ${user.name}: ${reason}`);

  complaintEvents.emit(COMPLAINT_EVENTS.REJECTED, { complaint, assignment, actor: actorOf(user), reason });
  return getAssignment(user, assignmentId);
}

async function getStaffDashboard(user) {
  const staffId = new mongoose.Types.ObjectId(user.id);
  const [counts, current, recentCompleted] = await Promise.all([
    Assignment.aggregate([{ $match: { assignedTo: staffId } }, { $group: { _id: '$assignmentStatus', count: { $sum: 1 } } }]),
    listForStaff(user, { view: 'current', limit: 50 }),
    populateAssignment(
      Assignment.find({ assignedTo: user.id, assignmentStatus: ASSIGNMENT_STATUS.COMPLETED })
        .sort({ completedAt: -1 })
        .limit(5)
    ),
  ]);
  const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.count]));
  const pending = current.items.filter((a) => a.assignmentStatus === ASSIGNMENT_STATUS.PENDING);
  const active = current.items.filter((a) => a.assignmentStatus === ASSIGNMENT_STATUS.ACCEPTED);

  return {
    totals: {
      pending: byStatus[ASSIGNMENT_STATUS.PENDING] || 0,
      active: byStatus[ASSIGNMENT_STATUS.ACCEPTED] || 0,
      completed: byStatus[ASSIGNMENT_STATUS.COMPLETED] || 0,
      overdue: active.filter((a) => a.complaint.isOverdue).length,
    },
    pending,
    active,
    recentCompleted: recentCompleted.map(decorate),
  };
}

async function getWorkHistory(user, query) {
  const staffId = new mongoose.Types.ObjectId(user.id);
  const [list, [stats]] = await Promise.all([
    listForStaff(user, { ...query, view: query.view || 'history' }),
    Complaint.aggregate([
      { $match: { assignedTo: staffId, resolvedAt: { $ne: null } } },
      {
        $group: {
          _id: null,
          resolved: { $sum: 1 },
          avgResolutionHours: { $avg: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000] } },
          avgRating: { $avg: '$feedback.rating' },
          ratings: { $sum: { $cond: [{ $gt: ['$feedback.rating', null] }, 1, 0] } },
        },
      },
    ]),
  ]);
  return {
    items: list.items,
    meta: list.meta,
    stats: {
      resolved: stats?.resolved || 0,
      avgResolutionHours: stats?.avgResolutionHours ? Math.round(stats.avgResolutionHours * 10) / 10 : null,
      avgRating: stats?.avgRating ? Math.round(stats.avgRating * 10) / 10 : null,
      ratings: stats?.ratings || 0,
    },
  };
}

module.exports = { listForStaff, getAssignment, acceptAssignment, rejectAssignment, getStaffDashboard, getWorkHistory };
