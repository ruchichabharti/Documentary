/**
 * lib/api.js — HTTP API client
 * All fetch calls go through here so the base URL is configured once.
 */

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function getToken() {
  return localStorage.getItem('collab_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Request failed');
  }

  return res.json();
}

export const api = {
  // Auth
  signup: (email, password) =>
    request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) }),

  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  // Documents
  listDocs: () => request('/docs'),

  createDoc: (title = 'Untitled') =>
    request('/docs', { method: 'POST', body: JSON.stringify({ title }) }),

  getDoc: (id) => request(`/docs/${id}`),

  updateTitle: (id, title) =>
    request(`/docs/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }),

  deleteDoc: (id) =>
    request(`/docs/${id}`, { method: 'DELETE' }),
};
