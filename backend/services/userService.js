const User = require('../models/User');
const Complaint = require('../models/Complaint');
const ApiError = require('../utils/ApiError');
const { ROLES, OPEN_STATUSES } = require('../utils/constants');
const { getPagination, buildMeta } = require('../utils/pagination');
const { disconnectUser } = require('../sockets');
const { notifyUsers } = require('./notificationService');

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* ---------------------------------------------------------------- profile */

const PROFILE_FIELDS_BY_ROLE = {
  [ROLES.STUDENT]: ['name', 'phone', 'department', 'hostel', 'bio'],
  [ROLES.STAFF]: ['name', 'phone', 'bio'],
  [ROLES.ADMIN]: ['name', 'phone', 'department', 'bio'],
};

async function updateOwnProfile(user, input) {
  const allowed = PROFILE_FIELDS_BY_ROLE[user.role] || [];
  const doc = await User.findById(user.id);
  for (const field of allowed) {
    if (input[field] !== undefined) doc[field] = input[field];
  }
  await doc.save();
  return doc;
}

async function changePassword(user, { currentPassword, newPassword }) {
  const doc = await User.findById(user.id).select('+password +refreshSessions');
  if (!(await doc.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  if (currentPassword === newPassword) throw ApiError.badRequest('New password must be different');
  doc.password = newPassword;
  // Sign out other devices: keep only the most recent session (this one).
  doc.refreshSessions = doc.refreshSessions.slice(-1);
  await doc.save();
}

/* ---------------------------------------------------------------- admin */

async function listUsers(query) {
  const pagination = getPagination(query);
  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.status === 'active') filter.isActive = true;
  if (query.status === 'inactive') filter.isActive = false;
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }, { studentId: pattern }, { department: pattern }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit),
    User.countDocuments(filter),
  ]);

  // Attach complaint counts for students in a single aggregation.
  const ids = users.map((u) => u._id);
  const counts = await Complaint.aggregate([
    { $match: { reportedBy: { $in: ids } } },
    { $group: { _id: '$reportedBy', total: { $sum: 1 }, open: { $sum: { $cond: [{ $in: ['$status', OPEN_STATUSES] }, 1, 0] } } } },
  ]);
  const byUser = Object.fromEntries(counts.map((c) => [String(c._id), c]));
  const items = users.map((u) => ({
    ...u.toJSON(),
    complaints: { total: byUser[String(u._id)]?.total || 0, open: byUser[String(u._id)]?.open || 0 },
  }));
  return { items, meta: buildMeta(pagination, total) };
}

// Staff directory with live workload, used by staff management and the assign dialog.
async function listStaffWithWorkload({ category, activeOnly } = {}) {
  const filter = { role: ROLES.STAFF };
  if (activeOnly) filter.isActive = true;
  const staff = await User.find(filter).sort({ name: 1 });

  const workload = await Complaint.aggregate([
    { $match: { assignedTo: { $in: staff.map((s) => s._id) } } },
    {
      $group: {
        _id: '$assignedTo',
        open: { $sum: { $cond: [{ $in: ['$status', OPEN_STATUSES] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $gt: ['$resolvedAt', null] }, 1, 0] } },
        critical: {
          $sum: { $cond: [{ $and: [{ $in: ['$status', OPEN_STATUSES] }, { $eq: ['$priority', 'Critical'] }] }, 1, 0] },
        },
      },
    },
  ]);
  const byStaff = Object.fromEntries(workload.map((w) => [String(w._id), w]));

  return staff
    .map((s) => {
      const w = byStaff[String(s._id)] || {};
      return {
        ...s.toJSON(),
        workload: { open: w.open || 0, resolved: w.resolved || 0, critical: w.critical || 0 },
        matchesCategory: category ? (s.specializations || []).includes(category) : undefined,
      };
    })
    .sort((a, b) => (category ? Number(b.matchesCategory) - Number(a.matchesCategory) : 0) || a.workload.open - b.workload.open);
}

async function createStaff(input) {
  if (await User.exists({ email: input.email })) throw ApiError.conflict('An account with this email already exists');
  const staff = await User.create({ ...input, role: ROLES.STAFF, isActive: true });
  return staff;
}

const ADMIN_EDITABLE = ['name', 'phone', 'department', 'designation', 'specializations', 'studentId', 'hostel', 'isActive'];

async function updateUserByAdmin(admin, userId, input) {
  const target = await User.findById(userId).select('+refreshSessions');
  if (!target) throw ApiError.notFound('User not found');
  if (target.role === ROLES.ADMIN) {
    throw ApiError.forbidden('Administrator accounts cannot be modified from user management');
  }

  if (input.isActive === false && target.isActive) {
    if (target.role === ROLES.STAFF) {
      const open = await Complaint.countDocuments({ assignedTo: target._id, status: { $in: OPEN_STATUSES } });
      if (open > 0) {
        throw ApiError.conflict(`Reassign ${open} open complaint${open > 1 ? 's' : ''} before deactivating this account`);
      }
    }
    target.refreshSessions = [];
  }

  for (const field of ADMIN_EDITABLE) {
    if (input[field] !== undefined) target[field] = input[field];
  }
  await target.save();

  if (input.isActive === false) disconnectUser(String(target._id));
  if (input.isActive === true) {
    await notifyUsers([target._id], {
      title: 'Account reactivated',
      message: `Your CampusFix account was reactivated by ${admin.name}.`,
      type: 'account',
    });
  }
  return target;
}

module.exports = { updateOwnProfile, changePassword, listUsers, listStaffWithWorkload, createStaff, updateUserByAdmin };
