const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Assignment = require('../models/Assignment');
const StatusHistory = require('../models/StatusHistory');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { STATUS, ROLES, PRIORITIES, OPEN_STATUSES, SLA_HOURS, ASSIGNMENT_STATUS } = require('../utils/constants');
const { getPagination, buildMeta } = require('../utils/pagination');
const { saveComplaintImages, deleteComplaintImages } = require('../utils/imageStorage');
const { complaintEvents, COMPLAINT_EVENTS } = require('../events/complaintEvents');
const { getAccessibleComplaint, idOf } = require('./complaintAccess');
const statusService = require('./statusService');

const REPORTER_FIELDS = 'name email department studentId phone hostel';
const STAFF_FIELDS = 'name email designation phone specializations';

function populateComplaint(query) {
  return query.populate('reportedBy', REPORTER_FIELDS).populate('assignedTo', STAFF_FIELDS);
}

function actorOf(user) {
  return { id: user.id, name: user.name, role: user.role };
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Mongo filter matching open complaints that have exceeded their priority's SLA.
function overdueFilter(now = new Date()) {
  return {
    status: { $in: OPEN_STATUSES },
    $or: Object.entries(SLA_HOURS).map(([priority, hours]) => ({
      priority,
      createdAt: { $lt: new Date(now.getTime() - hours * 3600 * 1000) },
    })),
  };
}

function isOverdue(complaint, now = Date.now()) {
  if (!OPEN_STATUSES.includes(complaint.status)) return false;
  const hours = SLA_HOURS[complaint.priority] ?? SLA_HOURS.Medium;
  return now - new Date(complaint.createdAt).getTime() > hours * 3600 * 1000;
}

function withOverdueFlag(complaint) {
  const json = typeof complaint.toJSON === 'function' ? complaint.toJSON() : complaint;
  return { ...json, isOverdue: isOverdue(json) };
}

/* ---------------------------------------------------------------- students */

async function createComplaint(user, input) {
  const { images, ...fields } = input;
  const imagePaths = await saveComplaintImages(images);

  let complaint;
  try {
    complaint = await Complaint.create({ ...fields, images: imagePaths, reportedBy: user.id, status: STATUS.SUBMITTED });
  } catch (err) {
    await deleteComplaintImages(imagePaths);
    throw err;
  }
  await StatusHistory.create({
    complaint: complaint._id,
    previousStatus: null,
    newStatus: STATUS.SUBMITTED,
    changedBy: user.id,
    remarks: 'Complaint submitted',
  });

  complaintEvents.emit(COMPLAINT_EVENTS.CREATED, { complaint, actor: actorOf(user) });
  return populateComplaint(Complaint.findById(complaint._id));
}

async function listStudentComplaints(user, query) {
  const pagination = getPagination(query);
  const filter = { reportedBy: user.id };
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ title: pattern }, { complaintCode: pattern }];
  }

  const [items, total] = await Promise.all([
    populateComplaint(Complaint.find(filter).sort({ updatedAt: -1 }).skip(pagination.skip).limit(pagination.limit)),
    Complaint.countDocuments(filter),
  ]);
  return { items: items.map(withOverdueFlag), meta: buildMeta(pagination, total) };
}

async function getStudentSummary(user) {
  const reporterId = new mongoose.Types.ObjectId(user.id);
  const [counts, recent, activity] = await Promise.all([
    Complaint.aggregate([{ $match: { reportedBy: reporterId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    populateComplaint(Complaint.find({ reportedBy: user.id }).sort({ updatedAt: -1 }).limit(5)),
    StatusHistory.aggregate([
      { $lookup: { from: 'complaints', localField: 'complaint', foreignField: '_id', as: 'complaint' } },
      { $unwind: '$complaint' },
      { $match: { 'complaint.reportedBy': reporterId } },
      { $sort: { createdAt: -1 } },
      { $limit: 8 },
      { $lookup: { from: 'users', localField: 'changedBy', foreignField: '_id', as: 'changedBy' } },
      { $unwind: '$changedBy' },
      {
        $project: {
          previousStatus: 1,
          newStatus: 1,
          remarks: 1,
          createdAt: 1,
          'changedBy.name': 1,
          'changedBy.role': 1,
          'complaint._id': 1,
          'complaint.complaintCode': 1,
          'complaint.title': 1,
        },
      },
    ]),
  ]);

  const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.count]));
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  const resolved = (byStatus[STATUS.RESOLVED] || 0) + (byStatus[STATUS.CLOSED] || 0);
  return {
    totals: { total, open: total - resolved, resolved, awaitingConfirmation: byStatus[STATUS.RESOLVED] || 0 },
    byStatus,
    recent: recent.map(withOverdueFlag),
    activity,
  };
}

async function reopenComplaint(user, complaintId, { reason }) {
  const complaint = await getAccessibleComplaint(user, complaintId);
  if (idOf(complaint.reportedBy) !== user.id) throw ApiError.forbidden('Only the reporter can reopen this complaint');
  if (complaint.status !== STATUS.RESOLVED) {
    throw ApiError.unprocessable('Only resolved complaints can be reopened');
  }

  complaint.reopenCount += 1;
  complaint.resolvedAt = undefined;
  await statusService.changeStatus(complaint, STATUS.REOPENED, user.id, reason);

  // The same staff member stays responsible; their completed assignment becomes active again.
  await Assignment.findOneAndUpdate(
    { complaint: complaint._id, assignedTo: complaint.assignedTo, assignmentStatus: ASSIGNMENT_STATUS.COMPLETED },
    { assignmentStatus: ASSIGNMENT_STATUS.ACCEPTED, $unset: { completedAt: 1 } },
    { sort: { assignedAt: -1 } }
  );

  complaintEvents.emit(COMPLAINT_EVENTS.REOPENED, { complaint, actor: actorOf(user), reason });
  return populateComplaint(Complaint.findById(complaint._id));
}

// Feedback confirms the fix: a resolved complaint is closed with the rating attached.
async function submitFeedback(user, complaintId, { rating, comment }) {
  const complaint = await getAccessibleComplaint(user, complaintId);
  if (idOf(complaint.reportedBy) !== user.id) throw ApiError.forbidden('Only the reporter can leave feedback');
  if (complaint.feedback?.rating) throw ApiError.conflict('Feedback has already been submitted');

  const canRate = complaint.status === STATUS.RESOLVED || (complaint.status === STATUS.CLOSED && complaint.resolvedAt);
  if (!canRate) throw ApiError.unprocessable('Feedback can be given once the complaint has been resolved');

  complaint.feedback = { rating, comment, submittedAt: new Date() };
  if (complaint.status === STATUS.RESOLVED) {
    complaint.closedAt = new Date();
    await statusService.changeStatus(complaint, STATUS.CLOSED, user.id, `Confirmed by reporter (rated ${rating}/5)`);
    complaintEvents.emit(COMPLAINT_EVENTS.CLOSED, { complaint, actor: actorOf(user), reason: 'Confirmed by reporter' });
  } else {
    await complaint.save();
  }

  complaintEvents.emit(COMPLAINT_EVENTS.FEEDBACK_SUBMITTED, { complaint, actor: actorOf(user), rating });
  return populateComplaint(Complaint.findById(complaint._id));
}

/* ---------------------------------------------------------------- shared */

async function getComplaintDetails(user, complaintId) {
  const complaint = await getAccessibleComplaint(user, complaintId);
  const assignmentFilter = { complaint: complaint._id };
  if (user.role === ROLES.STAFF) assignmentFilter.assignedTo = user.id;

  const [populated, history, assignments] = await Promise.all([
    populateComplaint(Complaint.findById(complaint._id)),
    statusService.getHistory(complaint._id),
    user.role === ROLES.STUDENT
      ? []
      : Assignment.find(assignmentFilter)
          .sort({ assignedAt: -1 })
          .populate('assignedTo', 'name designation')
          .populate('assignedBy', 'name'),
  ]);
  return { complaint: withOverdueFlag(populated), history, assignments };
}

async function getComplaintHistory(user, complaintId) {
  const complaint = await getAccessibleComplaint(user, complaintId);
  return statusService.getHistory(complaint._id);
}

/* ---------------------------------------------------------------- staff */

const STAFF_STATUS_RULES = {
  [STATUS.IN_PROGRESS]: [STATUS.ACCEPTED, STATUS.REOPENED],
  [STATUS.RESOLVED]: [STATUS.IN_PROGRESS],
};

async function updateStatusByStaff(user, complaintId, { status, remarks, resolutionNotes }) {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) throw ApiError.notFound('Complaint not found');
  if (idOf(complaint.assignedTo) !== user.id) {
    throw ApiError.forbidden('You can only update complaints assigned to you');
  }

  const allowedFrom = STAFF_STATUS_RULES[status];
  if (!allowedFrom) throw ApiError.badRequest('Staff can set the status to "In Progress" or "Resolved"');
  if (!allowedFrom.includes(complaint.status)) {
    throw ApiError.unprocessable(`A complaint cannot move from "${complaint.status}" to "${status}"`);
  }

  if (status === STATUS.RESOLVED) {
    if (!resolutionNotes) throw ApiError.badRequest('Resolution notes are required to resolve a complaint');
    complaint.resolutionNotes = resolutionNotes;
    complaint.resolvedAt = new Date();
  }
  const previousStatus = await statusService.changeStatus(complaint, status, user.id, remarks || resolutionNotes);

  if (status === STATUS.RESOLVED) {
    await Assignment.findOneAndUpdate(
      { complaint: complaint._id, assignedTo: user.id, assignmentStatus: ASSIGNMENT_STATUS.ACCEPTED },
      { assignmentStatus: ASSIGNMENT_STATUS.COMPLETED, completedAt: new Date() },
      { sort: { assignedAt: -1 } }
    );
  }

  const payload = { complaint, actor: actorOf(user), previousStatus, remarks };
  complaintEvents.emit(status === STATUS.RESOLVED ? COMPLAINT_EVENTS.RESOLVED : COMPLAINT_EVENTS.STATUS_UPDATED, payload);
  return populateComplaint(Complaint.findById(complaint._id));
}

/* ---------------------------------------------------------------- admin */

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  updated: { updatedAt: -1 },
  priority: { priorityRank: -1, createdAt: 1 },
};

async function listAllComplaints(query) {
  const pagination = getPagination(query);
  const match = {};
  for (const field of ['status', 'category', 'priority', 'building']) {
    if (query[field]) match[field] = query[field];
  }
  if (query.assignedTo === 'unassigned') match.assignedTo = null;
  else if (query.assignedTo) match.assignedTo = new mongoose.Types.ObjectId(query.assignedTo);
  if (query.open) match.status = { $in: OPEN_STATUSES };
  if (query.overdue) Object.assign(match, overdueFilter());
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    match.$and = [{ $or: [{ title: pattern }, { complaintCode: pattern }, { roomNumber: pattern }, { location: pattern }] }];
  }

  const [result] = await Complaint.aggregate([
    { $match: match },
    { $addFields: { priorityRank: { $indexOfArray: [PRIORITIES, '$priority'] } } },
    { $sort: SORTS[query.sort] || SORTS.newest },
    {
      $facet: {
        items: [
          { $skip: pagination.skip },
          { $limit: pagination.limit },
          { $lookup: { from: 'users', localField: 'reportedBy', foreignField: '_id', as: 'reportedBy' } },
          { $lookup: { from: 'users', localField: 'assignedTo', foreignField: '_id', as: 'assignedTo' } },
          {
            $set: {
              reportedBy: { $first: '$reportedBy' },
              assignedTo: { $ifNull: [{ $first: '$assignedTo' }, null] },
            },
          },
          {
            $project: {
              __v: 0,
              priorityRank: 0,
              'reportedBy.password': 0,
              'reportedBy.refreshSessions': 0,
              'assignedTo.password': 0,
              'assignedTo.refreshSessions': 0,
            },
          },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ]);

  const total = result.total[0]?.count || 0;
  return { items: result.items.map(withOverdueFlag), meta: buildMeta(pagination, total) };
}

const ASSIGNABLE_FROM = [STATUS.SUBMITTED, STATUS.ASSIGNED, STATUS.ACCEPTED, STATUS.IN_PROGRESS, STATUS.REOPENED];

async function assignComplaint(admin, complaintId, { staffId, remarks }) {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) throw ApiError.notFound('Complaint not found');
  if (!ASSIGNABLE_FROM.includes(complaint.status)) {
    throw ApiError.unprocessable(`A complaint with status "${complaint.status}" cannot be assigned`);
  }

  const staff = await User.findById(staffId);
  if (!staff || staff.role !== ROLES.STAFF) throw ApiError.badRequest('Selected user is not a maintenance staff member');
  if (!staff.isActive) throw ApiError.badRequest('Selected staff member is deactivated');

  const previousStaffId = complaint.assignedTo ? String(complaint.assignedTo) : null;
  if (previousStaffId === String(staff._id) && complaint.status !== STATUS.REOPENED) {
    throw ApiError.conflict(`This complaint is already assigned to ${staff.name}`);
  }

  // Close out any active assignment before creating the new one.
  await Assignment.updateMany(
    {
      complaint: complaint._id,
      assignmentStatus: { $in: [ASSIGNMENT_STATUS.PENDING, ASSIGNMENT_STATUS.ACCEPTED] },
    },
    { assignmentStatus: ASSIGNMENT_STATUS.REASSIGNED }
  );
  const assignment = await Assignment.create({
    complaint: complaint._id,
    assignedBy: admin.id,
    assignedTo: staff._id,
    remarks,
  });

  complaint.assignedTo = staff._id;
  let historyNote = `Assigned to ${staff.name}`;
  if (previousStaffId && previousStaffId !== String(staff._id)) {
    const previous = await User.findById(previousStaffId).select('name');
    historyNote = `Reassigned from ${previous?.name || 'previous staff'} to ${staff.name}`;
  }
  if (remarks) historyNote += ` - ${remarks}`;
  await statusService.changeStatus(complaint, STATUS.ASSIGNED, admin.id, historyNote);

  complaintEvents.emit(COMPLAINT_EVENTS.ASSIGNED, {
    complaint,
    assignment,
    staff: { id: String(staff._id), name: staff.name },
    previousStaffId,
    actor: actorOf(admin),
  });
  return populateComplaint(Complaint.findById(complaint._id));
}

const ADMIN_CLOSABLE = [STATUS.SUBMITTED, STATUS.RESOLVED, STATUS.REOPENED];

async function closeComplaintByAdmin(admin, complaintId, { remarks }) {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) throw ApiError.notFound('Complaint not found');
  if (!ADMIN_CLOSABLE.includes(complaint.status)) {
    throw ApiError.unprocessable(`A complaint with status "${complaint.status}" cannot be closed`);
  }
  complaint.closedAt = new Date();
  await statusService.changeStatus(complaint, STATUS.CLOSED, admin.id, remarks);
  await Assignment.updateMany(
    { complaint: complaint._id, assignmentStatus: { $in: [ASSIGNMENT_STATUS.PENDING, ASSIGNMENT_STATUS.ACCEPTED] } },
    { assignmentStatus: ASSIGNMENT_STATUS.COMPLETED, completedAt: new Date() }
  );
  complaintEvents.emit(COMPLAINT_EVENTS.CLOSED, { complaint, actor: actorOf(admin), reason: remarks });
  return populateComplaint(Complaint.findById(complaint._id));
}

module.exports = {
  createComplaint,
  listStudentComplaints,
  getStudentSummary,
  reopenComplaint,
  submitFeedback,
  getComplaintDetails,
  getComplaintHistory,
  updateStatusByStaff,
  listAllComplaints,
  assignComplaint,
  closeComplaintByAdmin,
  overdueFilter,
  isOverdue,
  withOverdueFlag,
  populateComplaint,
  actorOf,
};
