import { api } from './api';

export const getNotifications = (query) => api.get('/api/notifications', query);
export const getUnreadCount = () => api.get('/api/notifications/unread-count').then((r) => r.data.unreadCount);
export const markNotificationRead = (id) => api.patch(`/api/notifications/${id}/read`).then((r) => r.data.notification);
export const markAllNotificationsRead = () => api.patch('/api/notifications/read-all');
