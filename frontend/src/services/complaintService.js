import { api } from './api';

// Student
export const getMySummary = () => api.get('/api/complaints/my-summary').then((r) => r.data);
export const getMyComplaints = (query) => api.get('/api/complaints/my-complaints', query);
export const createComplaint = (body) => api.post('/api/complaints', body).then((r) => r.data.complaint);
export const reopenComplaint = (id, reason) => api.post(`/api/complaints/${id}/reopen`, { reason }).then((r) => r.data.complaint);
export const submitFeedback = (id, body) => api.post(`/api/complaints/${id}/feedback`, body).then((r) => r.data.complaint);

// Shared
export const getComplaint = (id) => api.get(`/api/complaints/${id}`).then((r) => r.data);
export const getComments = (id) => api.get(`/api/complaints/${id}/comments`).then((r) => r.data.comments);
export const addComment = (id, message) => api.post(`/api/complaints/${id}/comments`, { message }).then((r) => r.data.comment);

// Staff
export const updateStatus = (id, body) => api.patch(`/api/complaints/${id}/status`, body).then((r) => r.data.complaint);
