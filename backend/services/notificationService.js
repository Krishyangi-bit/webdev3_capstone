const Notification = require('../models/Notification');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { ROLES } = require('../utils/constants');
const { getPagination, buildMeta } = require('../utils/pagination');
const { emitToUser } = require('../sockets');

// Persist one notification per recipient and push each over Socket.IO.
async function notifyUsers(recipientIds, { title, message, type, complaintId = null }) {
  const unique = [...new Set(recipientIds.filter(Boolean).map(String))];
  if (unique.length === 0) return [];

  const docs = await Notification.insertMany(
    unique.map((recipient) => ({ recipient, title, message, type, relatedComplaint: complaintId }))
  );
  for (const doc of docs) {
    emitToUser(String(doc.recipient), 'notification:new', doc.toJSON());
  }
  return docs;
}

async function getActiveAdminIds() {
  const admins = await User.find({ role: ROLES.ADMIN, isActive: true }).select('_id').lean();
  return admins.map((a) => String(a._id));
}

async function listForUser(userId, query) {
  const pagination = getPagination(query);
  const filter = { recipient: userId };
  if (query.unread) filter.isRead = false;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('relatedComplaint', 'complaintCode title status'),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: userId, isRead: false }),
  ]);
  return { items, meta: { ...buildMeta(pagination, total), unreadCount } };
}

async function markAsRead(userId, notificationId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true },
    { returnDocument: 'after' }
  );
  if (!notification) throw ApiError.notFound('Notification not found');
  return notification;
}

async function markAllAsRead(userId) {
  const result = await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
  return result.modifiedCount;
}

function countUnread(userId) {
  return Notification.countDocuments({ recipient: userId, isRead: false });
}

module.exports = { notifyUsers, getActiveAdminIds, listForUser, markAsRead, markAllAsRead, countUnread };
