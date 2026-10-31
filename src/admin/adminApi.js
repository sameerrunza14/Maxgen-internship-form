// All calls from the admin panel to the backend.
// The sign-in token is kept in this browser (localStorage) and sent with every request.

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'maxgen-admin-token';

export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function saveToken(token) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage blocked (private mode): the admin will need to sign in again after a refresh
  }
}

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

// Thrown when the token is missing or expired, so the page can send the admin to the login screen
export class SessionExpiredError extends Error {
  constructor(message) {
    super(message || 'Your session has expired. Please sign in again.');
    this.name = 'SessionExpiredError';
  }
}

async function request(path, options) {
  const settings = options || {};
  const headers = { ...(settings.headers || {}) };

  const token = getToken();
  if (token) {
    headers.Authorization = 'Bearer ' + token;
  }
  if (settings.body && !(settings.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(API_BASE_URL + path, {
      method: settings.method || 'GET',
      headers: headers,
      body: settings.body ? JSON.stringify(settings.body) : undefined,
    });
  } catch {
    throw new Error('Could not reach the server. Check your internet connection and try again.');
  }

  if (response.status === 401 && path !== '/api/auth/login') {
    clearToken();
    let message = '';
    try {
      message = (await response.json()).message;
    } catch {
      message = '';
    }
    throw new SessionExpiredError(message);
  }

  if (settings.returnBlob) {
    if (!response.ok) {
      let message = 'Could not open this document.';
      try {
        message = (await response.json()).message || message;
      } catch {
        // not JSON
      }
      throw new Error(message);
    }
    return response.blob();
  }

  let result = null;
  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok || !result || !result.success) {
    throw new Error(result && result.message ? result.message : 'Something went wrong. Please try again.');
  }
  return result;
}

// ---------- Sign in ----------

export async function login(email, password) {
  const result = await request('/api/auth/login', { method: 'POST', body: { email: email, password: password } });
  saveToken(result.data.token);
  return result.data.admin;
}

export async function getCurrentAdmin() {
  const result = await request('/api/auth/me');
  return result.data.admin;
}

// ---------- Applications ----------

export async function getStats() {
  const result = await request('/api/admin/applications/stats');
  return result.data.stats;
}

// filters: { page, status, technology, location, mode, search }
export async function listApplications(filters) {
  const params = new URLSearchParams();
  const keys = Object.keys(filters);
  for (let i = 0; i < keys.length; i++) {
    const value = filters[keys[i]];
    if (value !== '' && value !== undefined && value !== null) {
      params.set(keys[i], value);
    }
  }
  const result = await request('/api/admin/applications?' + params.toString());
  return result.data;
}

export async function getApplication(id) {
  const result = await request('/api/admin/applications/' + encodeURIComponent(id));
  return result.data.application;
}

export async function updateStatus(id, status) {
  const result = await request('/api/admin/applications/' + encodeURIComponent(id) + '/status', {
    method: 'PATCH',
    body: { status: status },
  });
  return result.data.application;
}

// Opens a document in a new tab (view) or saves it (download).
// The file needs the sign-in token, so we fetch it first and then show it.
export async function openDocument(applicationId, documentType, fileName, download) {
  // Open the tab right away (inside the click), otherwise the browser may block it as a pop-up
  let newTab = null;
  if (!download) {
    newTab = window.open('', '_blank');
  }

  try {
    const path =
      '/api/admin/applications/' + encodeURIComponent(applicationId) + '/documents/' + documentType +
      (download ? '?download=true' : '');
    const blob = await request(path, { returnBlob: true });
    const url = URL.createObjectURL(blob);

    if (newTab) {
      newTab.location.href = url;
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    // Free the memory a minute later (the tab has loaded the file by then)
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 60000);
  } catch (error) {
    if (newTab) {
      newTab.close();
    }
    throw error;
  }
}
