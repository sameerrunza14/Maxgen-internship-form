import { IS_DEMO_MODE } from '../config/demoMode';

// All calls from the admin panel to the backend.
// The sign-in token is kept in this browser tab (sessionStorage) and sent with every request.
// sessionStorage is cleared when the browser (or the tab) is closed, so the next visit asks for the password again.

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'maxgen-admin-token';

// Last time the admin clicked or typed (for the "signed out after 3 hours of no use" rule)
const LAST_ACTIVE_KEY = 'maxgen-admin-last-active';
export const IDLE_MINUTES = 180; // 3 hours

// Older versions kept the token in localStorage (it stayed for days). Remove it once.
try {
  window.localStorage.removeItem(TOKEN_KEY);
} catch {
  // ignore
}

export function getToken() {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function saveToken(token) {
  try {
    window.sessionStorage.setItem(TOKEN_KEY, token);
    markActive();
  } catch {
    // Storage blocked (private mode): the admin will need to sign in again after a refresh
  }
}

export function clearToken() {
  try {
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(LAST_ACTIVE_KEY);
  } catch {
    // ignore
  }
}

// Saves "the admin did something now"
export function markActive() {
  try {
    window.sessionStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

// true when the admin has not clicked or typed for IDLE_MINUTES
export function isIdleTooLong() {
  try {
    const last = Number(window.sessionStorage.getItem(LAST_ACTIVE_KEY) || 0);
    if (!last) {
      return false;
    }
    return Date.now() - last > IDLE_MINUTES * 60 * 1000;
  } catch {
    return false;
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
      body: settings.body instanceof FormData ? settings.body : settings.body ? JSON.stringify(settings.body) : undefined,
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
  const now = new Date();
  const todayText = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  if (filters.joined === 'today') {
    saveBlob(blob, 'Maxgen joined today ' + todayText + '.xlsx');
    return;
  }
  if (filters.visited === 'today') {
    saveBlob(blob, 'Maxgen office visitors ' + todayText + '.xlsx');
    return;
  }
  saveBlob(blob, 'Maxgen internship applications ' + datePart + '.xlsx');
}

// note = { text, type, followUpDate ('YYYY-MM-DD' or '') }, photos = up to 3 File objects (JPG / PNG)
export async function addNote(id, note, photos) {
  const formData = new FormData();
  formData.append('text', note.text);
  formData.append('type', note.type);
  formData.append('followUpDate', note.followUpDate || '');
  for (let i = 0; i < photos.length; i++) {
    formData.append('photos', photos[i]);
  }
  const result = await request('/api/admin/applications/' + encodeURIComponent(id) + '/notes', {
    method: 'POST',
    body: formData,
  });
  return result.data.application;
}

// A note photo as a Blob (to show it; the photo needs the sign-in, so <img src> cannot load it directly)
export async function getNotePhoto(applicationId, photoId) {
  return request(
    '/api/admin/applications/' + encodeURIComponent(applicationId) + '/note-photos/' + encodeURIComponent(photoId),
    { returnBlob: true }
  );
}

// ---------- Fees tracker ----------

// totalFee: number or '' (no total fee)
export async function updateTotalFee(applicationId, totalFee) {
  const result = await request('/api/admin/applications/' + encodeURIComponent(applicationId) + '/fee', {
    method: 'PATCH',
    body: { totalFee: totalFee },
  });
  return { application: result.data.application, message: result.message };
}

// payment = { amount, method, paidOn, remark }, receipt = File or null
export async function addPayment(applicationId, payment, receipt) {
  const formData = new FormData();
  formData.append('amount', payment.amount);
  formData.append('method', payment.method);
  formData.append('paidOn', payment.paidOn);
  formData.append('remark', payment.remark);
  if (receipt) {
    formData.append('receipt', receipt);
  }
  const result = await request('/api/admin/applications/' + encodeURIComponent(applicationId) + '/payments', {
    method: 'POST',
    body: formData,
  });
  return { application: result.data.application, message: result.message };
}

export async function deletePayment(applicationId, paymentId) {
  const result = await request(
    '/api/admin/applications/' + encodeURIComponent(applicationId) + '/payments/' + encodeURIComponent(paymentId),
    { method: 'DELETE' }
  );
  return result.data.application;
}

export async function getReceipt(applicationId, paymentId) {
  return request(
    '/api/admin/applications/' + encodeURIComponent(applicationId) + '/payments/' + encodeURIComponent(paymentId) + '/receipt',
    { returnBlob: true }
  );
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
// technologies: the ones HR confirmed when accepting (only sent when the student chose more than one)
export async function updateStatus(id, status, sendEmail, technologies) {
  const body = { status: status, sendEmail: sendEmail === true };
  if (technologies) {
    body.technologies = technologies;
  }
  const result = await request('/api/admin/applications/' + encodeURIComponent(id) + '/status', {
    method: 'PATCH',
    body: body,
  });
  return {
    application: result.data.application,
    emailResult: result.data.emailResult,
    message: result.message,
  };
}

// Ticks / unticks "Student visited the office". Returns the updated application.
export async function updateVisited(id, visited) {
  const result = await request('/api/admin/applications/' + encodeURIComponent(id) + '/visited', {
    method: 'PATCH',
    body: { visited: visited },
  });
  return result.data.application;
}

// Ticks / unticks "Student joined the internship". Returns the updated application.
// Marks the student as joined (or removes the mark). Joining also accepts the application,
// and sendEmail = true sends the "Welcome, you have joined" email.
// joiningDate: 'YYYY-MM-DD' (shown in the email). Returns { application, emailResult, message }
export async function updateJoined(id, joined, sendEmail, joiningDate, technologies) {
  const body = { joined: joined, sendEmail: sendEmail === true, joiningDate: joiningDate || '' };
  if (technologies) {
    body.technologies = technologies;
  }
  const result = await request('/api/admin/applications/' + encodeURIComponent(id) + '/joined', {
    method: 'PATCH',
    body: body,
  });
  return { application: result.data.application, emailResult: result.data.emailResult, message: result.message };
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

// ---------- Letters / certificates (Offer letter, Completion certificate, Experience letter) ----------

// HR + superadmin: upload a PDF (replaces the old one). Returns { application, message }.
export async function uploadCertificate(applicationId, certificateType, file) {
  const formData = new FormData();
  formData.append('file', file);
  const result = await request(
    '/api/admin/applications/' + encodeURIComponent(applicationId) + '/certificates/' + certificateType,
    { method: 'POST', body: formData }
  );
  return { application: result.data.application, message: result.message };
}

// View in a new tab, or download. Works the same way as openDocument above.
export async function openCertificate(applicationId, certificateType, fileName, download) {
  let newTab = null;
  if (!download) {
    newTab = window.open('', '_blank');
  }
  try {
    const path =
      '/api/admin/applications/' + encodeURIComponent(applicationId) + '/certificates/' + certificateType +
      (download ? '?download=true' : '');
    const blob = await request(path, { returnBlob: true });
    const url = URL.createObjectURL(blob);
    if (newTab) {
      newTab.location.href = url;
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

// HR + superadmin: opens Gmail's "new email" page in a new tab with To, Subject and the message
// (with a download link) filled in. HR then presses Send in Gmail. Returns { application }.
export async function emailCertificate(applicationId, certificateType) {
  // Open the tab inside the click, otherwise the browser may block it as a pop-up
  const newTab = window.open('', '_blank');
  try {
    const result = await request(
      '/api/admin/applications/' + encodeURIComponent(applicationId) + '/certificates/' + certificateType + '/email',
      { method: 'POST' }
    );
    if (newTab) {
      newTab.location.href = result.data.gmailUrl;
    } else {
      window.location.href = result.data.gmailUrl;
    }
    return { application: result.data.application };
  } catch (error) {
    if (newTab) {
      newTab.close();
    }
    throw error;
  }
}

// HR + superadmin: opens WhatsApp with a ready message (with a download link) to the student's number.
// HR then presses Send in WhatsApp. Returns { application }.
export async function sendCertificateOnWhatsapp(applicationId, certificateType) {
  // Open the tab inside the click, otherwise the browser may block it as a pop-up
  const newTab = window.open('', '_blank');
  try {
    const result = await request(
      '/api/admin/applications/' + encodeURIComponent(applicationId) + '/certificates/' + certificateType + '/whatsapp',
      { method: 'POST' }
    );
    if (newTab) {
      newTab.location.href = result.data.whatsappUrl;
    } else {
      window.location.href = result.data.whatsappUrl;
    }
    return { application: result.data.application };
  } catch (error) {
    if (newTab) {
      newTab.close();
    }
    throw error;
  }
}

// Superadmin only: remove an uploaded letter. Returns { application, message }.
export async function deleteCertificate(applicationId, certificateType) {
  const result = await request(
    '/api/admin/applications/' + encodeURIComponent(applicationId) + '/certificates/' + certificateType,
    { method: 'DELETE' }
  );
  return { application: result.data.application, message: result.message };
}

// ---------- Superadmin: applications ----------

// Saves corrected details. values = same fields as the form (technologies / durations / letters are lists)
export async function editApplication(id, values) {
  const result = await request('/api/admin/applications/' + encodeURIComponent(id), { method: 'PATCH', body: values });
  return { application: result.data.application, message: result.message };
}

// HR: own notes only; superadmin: any note. Returns the updated application.
// note = { text, type, followUpDate }
export async function editNote(applicationId, noteId, note) {
  const result = await request(
    '/api/admin/applications/' + encodeURIComponent(applicationId) + '/notes/' + encodeURIComponent(noteId),
    { method: 'PATCH', body: { text: note.text, type: note.type, followUpDate: note.followUpDate || '' } }
  );
  return result.data.application;
}

export async function deleteNote(applicationId, noteId) {
  const result = await request(
    '/api/admin/applications/' + encodeURIComponent(applicationId) + '/notes/' + encodeURIComponent(noteId),
    { method: 'DELETE' }
  );
  return result.data.application;
}

// Each returns the message to show
export async function moveToTrash(id) {
  const result = await request('/api/admin/applications/' + encodeURIComponent(id) + '/trash', { method: 'POST' });
  return result.message;
}

export async function restoreApplication(id) {
  const result = await request('/api/admin/applications/' + encodeURIComponent(id) + '/restore', { method: 'POST' });
  return result.message;
}

export async function deleteForever(id) {
  const result = await request('/api/admin/applications/' + encodeURIComponent(id), { method: 'DELETE' });
  return result.message;
}

export async function emptyTrash() {
  const result = await request('/api/admin/trash', { method: 'DELETE' });
  return result.message;
}

// Downloads a ZIP: the Excel sheet + every document, one folder per application (same filters as the list)
export async function downloadBackup(filters) {
  const backupFilters = { ...filters };
  delete backupFilters.page;
  const blob = await request('/api/admin/backup?' + buildQuery(backupFilters), { returnBlob: true });
  saveBlob(blob, 'Maxgen applications backup ' + new Date().toISOString().slice(0, 10) + '.zip');
}

// ---------- Superadmin: users ----------

export async function listUsers() {
  const result = await request('/api/admin/users');
  return result.data;
}

// Returns { user, setupLink, emailSent, message }
export async function createUser(name, email, role) {
  const result = await request('/api/admin/users', { method: 'POST', body: { name: name, email: email, role: role } });
  return { ...result.data, message: result.message };
}

// changes = { name, email, role, isActive }
export async function updateUser(id, changes) {
  const result = await request('/api/admin/users/' + encodeURIComponent(id), { method: 'PATCH', body: changes });
  return { user: result.data.user, message: result.message };
}

// Removes the account for good. Returns { removedSelf, message }
export async function deleteUser(id) {
  const result = await request('/api/admin/users/' + encodeURIComponent(id), { method: 'DELETE' });
  return { ...result.data, message: result.message };
}

// Returns { setupLink, emailSent, message }
export async function sendSetupLink(id) {
  const result = await request('/api/admin/users/' + encodeURIComponent(id) + '/setup-link', { method: 'POST' });
  return { ...result.data, message: result.message };
}

// ---------- Superadmin: settings, reports, activity ----------

export async function getSettings() {
  const result = await request('/api/admin/settings');
  return result.data.settings;
}

export async function saveSettings(changes) {
  const result = await request('/api/admin/settings', { method: 'PATCH', body: changes });
  return { settings: result.data.settings, message: result.message };
}

// filters = { from, to }
export async function getReports(filters) {
  const result = await request('/api/admin/reports?' + buildQuery(filters || {}));
  return result.data;
}

// filters = { page, adminId, action, from, to }
export async function getActivity(filters) {
  const result = await request('/api/admin/activity?' + buildQuery(filters || {}));
  return result.data;
}

// Activity log trash (superadmin). Each returns the message to show.
export async function trashActivity(ids) {
  const result = await request('/api/admin/activity/trash', { method: 'POST', body: { ids: ids } });
  return result.message;
}

export async function restoreActivity(ids) {
  const result = await request('/api/admin/activity/restore', { method: 'POST', body: { ids: ids } });
  return result.message;
}

// Records of log changes (locked entries): deleted for ever at once, without the trash
export async function deleteLogRecords(ids) {
  const result = await request('/api/admin/activity/delete-records', { method: 'POST', body: { ids: ids } });
  return result.message;
}

// ids = list of ids, or null to empty the whole log trash
export async function deleteActivityForever(ids) {
  const body = ids ? { ids: ids } : { all: true };
  const result = await request('/api/admin/activity/delete-forever', { method: 'POST', body: body });
  return result.message;
}

// The technologies currently on the form (Settings page), for the Technology filter
export async function getFormTechnologies() {
  const response = await fetch(API_BASE_URL + '/api/applications/config');
  const result = await response.json();
  return result.data.config.technologies;
}
