const notificationService = require('../services/notificationService');
const { sendSuccess } = require('../utils/apiResponse');

async function listNotifications(req, res) {
  const { items, meta } = await notificationService.listForUser(req.user.id, req.validated.query);
  return sendSuccess(res, { message: 'Notifications fetched', data: { notifications: items }, meta });
}

async function getUnreadCount(req, res) {
  const unreadCount = await notificationService.countUnread(req.user.id);
  return sendSuccess(res, { message: 'Unread count', data: { unreadCount } });
}

async function markAsRead(req, res) {
  const notification = await notificationService.markAsRead(req.user.id, req.params.id);
  return sendSuccess(res, { message: 'Notification marked as read', data: { notification } });
}

async function markAllAsRead(req, res) {
  const updated = await notificationService.markAllAsRead(req.user.id);
  return sendSuccess(res, { message: 'All notifications marked as read', data: { updated } });
}

module.exports = { listNotifications, getUnreadCount, markAsRead, markAllAsRead };
