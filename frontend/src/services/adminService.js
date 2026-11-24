import { api } from './api';

export const getAdminDashboard = () => api.get('/api/admin/dashboard').then((r) => r.data);
export const getAllComplaints = (query) => api.get('/api/admin/complaints', query);
export const assignComplaint = (id, body) => api.patch(`/api/admin/complaints/${id}/assign`, body).then((r) => r.data.complaint);
export const closeComplaint = (id, remarks) => api.patch(`/api/admin/complaints/${id}/close`, { remarks }).then((r) => r.data.complaint);

export const getUsers = (query) => api.get('/api/admin/users', query);
export const updateUser = (id, body) => api.patch(`/api/admin/users/${id}`, body).then((r) => r.data.user);
export const getStaff = (query) => api.get('/api/admin/staff', query).then((r) => r.data.staff);
export const createStaff = (body) => api.post('/api/admin/staff', body).then((r) => r.data.user);

export const getAnalytics = (days) => api.get('/api/admin/analytics', { days }).then((r) => r.data);
export const getStaffPerformance = (days) => api.get('/api/admin/staff-performance', { days }).then((r) => r.data.staff);
