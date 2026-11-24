// Thin wrapper around fetch for the CampusFix API.
//
// - The access token lives only in memory (never localStorage).
// - The refresh token is an HttpOnly cookie the browser sends to /api/auth.
// - A 401 triggers one silent refresh and a retry; concurrent 401s share the
//   same refresh request.

let accessToken = null;
let refreshPromise = null;
let sessionExpiredHandler = () => {};

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.fieldErrors = Object.fromEntries((body?.errors || []).map((e) => [e.field, e.message]));
  }
}

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function onSessionExpired(handler) {
  sessionExpiredHandler = handler;
}

function buildUrl(path, query) {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '' && value !== false) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.success) {
          accessToken = null;
          throw new ApiError(body?.message || 'Session expired', res.status, body);
        }
        accessToken = body.data.accessToken;
        return body.data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function request(path, { method = 'GET', body, query, retry = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Cannot reach the CampusFix server. Check your connection and try again.', 0);
  }

  const data = await res.json().catch(() => null);

  if (res.status === 401 && retry && !path.startsWith('/api/auth/')) {
    try {
      await refreshSession();
    } catch {
      sessionExpiredHandler();
      throw new ApiError('Your session has expired. Please sign in again.', 401);
    }
    return request(path, { method, body, query, retry: false });
  }

  if (!res.ok || !data?.success) {
    throw new ApiError(data?.message || `Request failed (${res.status})`, res.status, data);
  }
  return data;
}

export const api = {
  get: (path, query) => request(path, { query }),
  post: (path, body = {}) => request(path, { method: 'POST', body }),
  patch: (path, body = {}) => request(path, { method: 'PATCH', body }),
};
