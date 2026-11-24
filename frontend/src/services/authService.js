import { api, request, setAccessToken, refreshSession } from './api';

export async function login(credentials) {
  const { data } = await api.post('/api/auth/login', credentials);
  setAccessToken(data.accessToken);
  return data.user;
}

export async function register(form) {
  const { data } = await api.post('/api/auth/register', form);
  setAccessToken(data.accessToken);
  return data.user;
}

export async function restoreSession() {
  const data = await refreshSession();
  return data.user;
}

export async function logout() {
  try {
    await request('/api/auth/logout', { method: 'POST', body: {} });
  } finally {
    setAccessToken(null);
  }
}
