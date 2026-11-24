import { api } from './api';

export const updateProfile = (body) => api.patch('/api/users/me', body).then((r) => r.data.user);
export const changePassword = (body) => api.patch('/api/users/me/password', body);
