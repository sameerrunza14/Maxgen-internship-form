import { IS_DEMO_MODE } from '../config/demoMode';

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
  // Demo preview: there is no backend yet
  if (IS_DEMO_MODE) {
    throw new Error('The admin panel needs the backend, which is not live yet. This is a demo preview of the form only.');
  }
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
    const error = new Error(result && result.message ? result.message : 'Something went wrong. Please try again.');
    error.fieldErrors = result && result.errors ? result.errors : {};
    throw error;
  }
  return result;
}

// Saves a file (Blob) to the computer / phone
function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 60000);
}

function buildQuery(filters) {
  const params = new URLSearchParams();
  const keys = Object.keys(filters);
  for (let i = 0; i < keys.length; i++) {
    const value = filters[keys[i]];
    if (value !== '' && value !== undefined && value !== null) {
      params.set(keys[i], value);
    }
  }
  return params.toString();
}

// ---------- Sign in ----------

export async function login(email, password) {
  const result = await request('/api/auth/login', { method: 'POST', body: { email: email, password: password } });
  saveToken(result.data.token);
  return result.data.admin;
}

// "Forgot password": emails a reset link. Returns the message to show.
export async function forgotPassword(email) {
  const result = await request('/api/auth/forgot-password', { method: 'POST', body: { email: email } });
  return result.message;
}

// Sets a new password using the code from the reset link. Returns the message to show.
export async function resetPassword(token, newPassword) {
  const result = await request('/api/auth/reset-password', {
    method: 'POST',
    body: { token: token, newPassword: newPassword },
  });
  return result.message;
}

export async function getCurrentAdmin() {
  const result = await request('/api/auth/me');
  return result.data.admin;
}

// ---------- Applications ----------

// filters: { from, to } (optional) so the numbers follow the date filter
export async function getStats(filters) {
  const result = await request('/api/admin/applications/stats?' + buildQuery(filters || {}));
  return result.data.stats;
}

// filters: { page, status, technology, location, mode, search }
export async function listApplications(filters) {
  const result = await request('/api/admin/applications?' + buildQuery(filters));
  return result.data;
}

// Downloads the applications that match the filters as an Excel file
export async function downloadExcel(filters) {
  const exportFilters = { ...filters };
  delete exportFilters.page;
  const blob = await request('/api/admin/applications/export?' + buildQuery(exportFilters), { returnBlob: true });
  // File name shows the dates chosen, e.g. "Maxgen internship applications 2026-10-01 to 2026-10-31.xlsx"
  let datePart = new Date().toISOString().slice(0, 10);
  if (filters.from && filters.to) {
    datePart = filters.from === filters.to ? filters.from : filters.from + ' to ' + filters.to;
  } else if (filters.from) {
    datePart = 'from ' + filters.from;
  } else if (filters.to) {
    datePart = 'up to ' + filters.to;
  }
  saveBlob(blob, 'Maxgen internship applications ' + datePart + '.xlsx');
}

export async function addNote(id, text) {
  const result = await request('/api/admin/applications/' + encodeURIComponent(id) + '/notes', {
    method: 'POST',
    body: { text: text },
  });
  return result.data.application;
}

export async function changePassword(currentPassword, newPassword) {
  const result = await request('/api/auth/password', {
    method: 'PATCH',
    body: { currentPassword: currentPassword, newPassword: newPassword },
  });
  // The old sign-in stops working after a password change, so keep the new one
  saveToken(result.data.token);
}

export async function getApplication(id) {
  const result = await request('/api/admin/applications/' + encodeURIComponent(id));
  return result.data.application;
}

// sendEmail: true = also email the student about the decision (accepted / rejected)
// Returns { application, emailResult, message }
export async function updateStatus(id, status, sendEmail) {
  const result = await request('/api/admin/applications/' + encodeURIComponent(id) + '/status', {
    method: 'PATCH',
    body: { status: status, sendEmail: sendEmail === true },
  });
  return {
    application: result.data.application,
    emailResult: result.data.emailResult,
    message: result.message,
  };
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
      // Free the memory a minute later (the tab has loaded the file by then)
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 60000);
    } else {
      URL.revokeObjectURL(url);
      saveBlob(blob, fileName);
    }
  } catch (error) {
    if (newTab) {
      newTab.close();
    }
    throw error;
  }
}
