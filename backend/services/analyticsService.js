const Complaint = require('../models/Complaint');
const Assignment = require('../models/Assignment');
const StatusHistory = require('../models/StatusHistory');
const User = require('../models/User');
const { STATUS, STATUSES, CATEGORIES, PRIORITIES, OPEN_STATUSES, ROLES } = require('../utils/constants');
const { overdueFilter, withOverdueFlag } = require('./complaintService');

const HOUR_MS = 3600000;
const round1 = (n) => (n === null || n === undefined ? null : Math.round(n * 10) / 10);

function sinceDate(days) {
  return days ? new Date(Date.now() - days * 24 * HOUR_MS) : null;
}

// Fills in zero counts so every known bucket is always present, in a stable order.
function toBuckets(rows, keys) {
  const map = Object.fromEntries(rows.map((r) => [r._id, r]));
  return keys.map((key) => ({ key, count: map[key]?.count || 0, ...(map[key]?.extra || {}) }));
}

/* ------------------------------------------------------------ dashboard */

async function getAdminDashboard() {
  const [facets] = await Complaint.aggregate([
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        byCategory: [{ $match: { status: { $in: OPEN_STATUSES } } }, { $group: { _id: '$category', count: { $sum: 1 } } }],
        criticalOpen: [{ $match: { priority: 'Critical', status: { $in: OPEN_STATUSES } } }, { $count: 'count' }],
        unassigned: [{ $match: { status: { $in: [STATUS.SUBMITTED, STATUS.REOPENED] }, assignedTo: null } }, { $count: 'count' }],
        overdue: [{ $match: overdueFilter() }, { $count: 'count' }],
        resolvedThisWeek: [{ $match: { resolvedAt: { $gte: sinceDate(7) } } }, { $count: 'count' }],
      },
    },
  ]);

  const byStatus = Object.fromEntries(facets.byStatus.map((s) => [s._id, s.count]));
  const total = facets.byStatus.reduce((sum, s) => sum + s.count, 0);
  const unresolved = OPEN_STATUSES.reduce((sum, s) => sum + (byStatus[s] || 0), 0);

  const [attention, recentActivity, workload] = await Promise.all([
    // Needs attention: overdue, or critical/high work nobody has picked up.
    Complaint.find({
      $or: [
        overdueFilter(),
        { priority: { $in: ['Critical', 'High'] }, status: { $in: [STATUS.SUBMITTED, STATUS.REOPENED] } },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(8)
      .populate('assignedTo', 'name')
      .populate('reportedBy', 'name'),
    StatusHistory.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('changedBy', 'name role')
      .populate('complaint', 'complaintCode title'),
    getStaffWorkload(),
  ]);

  return {
    totals: {
      total,
      unresolved,
      resolved: (byStatus[STATUS.RESOLVED] || 0) + (byStatus[STATUS.CLOSED] || 0),
      critical: facets.criticalOpen[0]?.count || 0,
      unassigned: facets.unassigned[0]?.count || 0,
      overdue: facets.overdue[0]?.count || 0,
      resolvedThisWeek: facets.resolvedThisWeek[0]?.count || 0,
    },
    byStatus: toBuckets(facets.byStatus, STATUSES),
    openByCategory: toBuckets(facets.byCategory, CATEGORIES),
    attention: attention.map(withOverdueFlag),
    recentActivity,
    workload,
  };
}

async function getStaffWorkload() {
  const rows = await User.aggregate([
    { $match: { role: ROLES.STAFF, isActive: true } },
    {
      $lookup: {
        from: 'complaints',
        let: { staffId: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$assignedTo', '$$staffId'] }, { $in: ['$status', OPEN_STATUSES] }] } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ],
        as: 'open',
      },
    },
    {
      $project: {
        name: 1,
        designation: 1,
        open: { $sum: '$open.count' },
        pending: {
          $sum: { $map: { input: { $filter: { input: '$open', cond: { $eq: ['$$this._id', STATUS.ASSIGNED] } } }, in: '$$this.count' } },
        },
      },
    },
    { $sort: { open: -1, name: 1 } },
  ]);
  return rows;
}

/* ------------------------------------------------------------ analytics */

async function getAnalytics({ days } = {}) {
  const since = sinceDate(days);
  const match = since ? { createdAt: { $gte: since } } : {};
  const trendDays = days && days <= 90 ? days : 30;
  const trendSince = sinceDate(trendDays);

  const [facets] = await Complaint.aggregate([
    { $match: match },
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        byCategory: [
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
              resolved: { $sum: { $cond: [{ $gt: ['$resolvedAt', null] }, 1, 0] } },
              avgHours: {
                $avg: {
                  $cond: [{ $gt: ['$resolvedAt', null] }, { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, HOUR_MS] }, null],
                },
              },
            },
          },
        ],
        byPriority: [
          {
            $group: {
              _id: '$priority',
              count: { $sum: 1 },
              avgHours: {
                $avg: {
                  $cond: [{ $gt: ['$resolvedAt', null] }, { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, HOUR_MS] }, null],
                },
              },
            },
          },
        ],
        byBuilding: [
          {
            $group: {
              _id: '$building',
              count: { $sum: 1 },
              open: { $sum: { $cond: [{ $in: ['$status', OPEN_STATUSES] }, 1, 0] } },
            },
          },
          { $sort: { count: -1 } },
        ],
        resolution: [
          { $match: { resolvedAt: { $ne: null } } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              avgHours: { $avg: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, HOUR_MS] } },
              avgRating: { $avg: '$feedback.rating' },
            },
          },
        ],
        // Share of complaints that were reported back as not fixed, among all
        // complaints that have ever been resolved (including currently reopened ones).
        reopens: [
          { $match: { $or: [{ resolvedAt: { $ne: null } }, { reopenCount: { $gt: 0 } }] } },
          {
            $group: {
              _id: null,
              everResolved: { $sum: 1 },
              reopened: { $sum: { $cond: [{ $gt: ['$reopenCount', 0] }, 1, 0] } },
            },
          },
        ],
      },
    },
  ]);

  const trendRows = await Complaint.aggregate([
    { $match: { createdAt: { $gte: trendSince } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, created: { $sum: 1 } } },
  ]);
  const resolvedRows = await Complaint.aggregate([
    { $match: { resolvedAt: { $gte: trendSince } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$resolvedAt' } }, resolved: { $sum: 1 } } },
  ]);
  const createdMap = Object.fromEntries(trendRows.map((r) => [r._id, r.created]));
  const resolvedMap = Object.fromEntries(resolvedRows.map((r) => [r._id, r.resolved]));
  const trend = [];
  for (let i = trendDays - 1; i >= 0; i -= 1) {
    const day = new Date(Date.now() - i * 24 * HOUR_MS).toISOString().slice(0, 10);
    trend.push({ date: day, created: createdMap[day] || 0, resolved: resolvedMap[day] || 0 });
  }

  const byStatus = Object.fromEntries(facets.byStatus.map((s) => [s._id, s.count]));
  const total = facets.byStatus.reduce((sum, s) => sum + s.count, 0);
  const resolution = facets.resolution[0] || {};
  const reopens = facets.reopens[0] || {};

  return {
    range: { days: days || null, since },
    totals: {
      total,
      pending: byStatus[STATUS.SUBMITTED] || 0,
      assigned: (byStatus[STATUS.ASSIGNED] || 0) + (byStatus[STATUS.ACCEPTED] || 0),
      inProgress: byStatus[STATUS.IN_PROGRESS] || 0,
      reopened: byStatus[STATUS.REOPENED] || 0,
      resolved: (byStatus[STATUS.RESOLVED] || 0) + (byStatus[STATUS.CLOSED] || 0),
      critical: await Complaint.countDocuments({ ...match, priority: 'Critical' }),
      avgResolutionHours: round1(resolution.avgHours),
      avgRating: round1(resolution.avgRating),
      reopenRate: reopens.everResolved ? round1((reopens.reopened / reopens.everResolved) * 100) : null,
    },
    byStatus: toBuckets(facets.byStatus, STATUSES),
    byCategory: CATEGORIES.map((key) => {
      const row = facets.byCategory.find((r) => r._id === key) || {};
      return { key, count: row.count || 0, resolved: row.resolved || 0, avgResolutionHours: round1(row.avgHours) };
    }),
    byPriority: PRIORITIES.map((key) => {
      const row = facets.byPriority.find((r) => r._id === key) || {};
      return { key, count: row.count || 0, avgResolutionHours: round1(row.avgHours) };
    }),
    byBuilding: facets.byBuilding.map((r) => ({ key: r._id, count: r.count, open: r.open })),
    trend,
  };
}

async function getStaffPerformance({ days } = {}) {
  const since = sinceDate(days);
  const assignmentMatch = since ? { assignedAt: { $gte: since } } : {};

  const [staff, assignmentStats, resolutionStats] = await Promise.all([
    User.find({ role: ROLES.STAFF }).sort({ name: 1 }),
    Assignment.aggregate([
      { $match: assignmentMatch },
      {
        $group: {
          _id: '$assignedTo',
          assigned: { $sum: 1 },
          accepted: { $sum: { $cond: [{ $ifNull: ['$acceptedAt', false] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$assignmentStatus', 'rejected'] }, 1, 0] } },
          avgResponseHours: {
            $avg: {
              $cond: [{ $ifNull: ['$acceptedAt', false] }, { $divide: [{ $subtract: ['$acceptedAt', '$assignedAt'] }, HOUR_MS] }, null],
            },
          },
        },
      },
    ]),
    Complaint.aggregate([
      { $match: { assignedTo: { $ne: null }, ...(since ? { createdAt: { $gte: since } } : {}) } },
      {
        $group: {
          _id: '$assignedTo',
          open: { $sum: { $cond: [{ $in: ['$status', OPEN_STATUSES] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $gt: ['$resolvedAt', null] }, 1, 0] } },
          avgResolutionHours: {
            $avg: {
              $cond: [{ $gt: ['$resolvedAt', null] }, { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, HOUR_MS] }, null],
            },
          },
          avgRating: { $avg: '$feedback.rating' },
          reopened: { $sum: { $cond: [{ $gt: ['$reopenCount', 0] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const aMap = Object.fromEntries(assignmentStats.map((r) => [String(r._id), r]));
  const rMap = Object.fromEntries(resolutionStats.map((r) => [String(r._id), r]));

  return staff.map((s) => {
    const a = aMap[String(s._id)] || {};
    const r = rMap[String(s._id)] || {};
    return {
      _id: s._id,
      name: s.name,
      designation: s.designation,
      specializations: s.specializations,
      isActive: s.isActive,
      assigned: a.assigned || 0,
      accepted: a.accepted || 0,
      rejected: a.rejected || 0,
      open: r.open || 0,
      resolved: r.resolved || 0,
      reopened: r.reopened || 0,
      avgResponseHours: round1(a.avgResponseHours),
      avgResolutionHours: round1(r.avgResolutionHours),
      avgRating: round1(r.avgRating),
    };
  });
}

module.exports = { getAdminDashboard, getAnalytics, getStaffPerformance };
