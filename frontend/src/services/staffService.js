import { api } from './api';

export const getStaffDashboard = () => api.get('/api/staff/dashboard').then((r) => r.data);
export const getAssignments = (query) => api.get('/api/staff/assignments', query);
export const getAssignment = (id) => api.get(`/api/staff/assignments/${id}`).then((r) => r.data.assignment);
export const acceptAssignment = (id, remarks) => api.patch(`/api/staff/assignments/${id}/accept`, { remarks }).then((r) => r.data.assignment);
export const rejectAssignment = (id, reason) => api.patch(`/api/staff/assignments/${id}/reject`, { reason }).then((r) => r.data.assignment);
export const getWorkHistory = (query) => api.get('/api/staff/work-history', query);
