import { getDocumentsFor } from '../constants/formOptions';
import { IS_DEMO_MODE } from '../config/demoMode';

// "LinkedIn", or "Ref. from Friends - Rahul Shah" when extra detail is given
export function buildReferenceText(values) {
  const detail = values.referenceDetail.trim();
  if (detail && (values.referenceSource === 'Ref. from Friends' || values.referenceSource === 'Any Other')) {
    return values.referenceSource + ' - ' + detail;
  }
  return values.referenceSource;
}

// Builds the multipart data in exactly the format the backend expects (POST /api/applications).
export function buildApplicationFormData(values, files) {
  const formData = new FormData();

  let qualification = values.qualification;
  if (qualification === 'Other') {
    qualification = values.qualificationOther.trim();
  }

  formData.append('fullName', values.fullName.trim());
  formData.append('email', values.email.trim());
  formData.append('contactNumber', values.contactNumber);
  formData.append('parentContactNumber', values.parentContactNumber);
  formData.append('gender', values.gender);
  formData.append('address', values.address.trim());

  const isPassout = values.educationStatus === 'passout';
  formData.append('educationStatus', values.educationStatus); // 'pursuing' or 'passout'
  formData.append('qualification', qualification);
  formData.append('specialization', values.specialization.trim());
  formData.append('institute', values.institute.trim()); // college / university name
  if (isPassout) {
    formData.append('trainingCenter', values.trainingCenter.trim());
  } else {
    formData.append('semester', values.semester); // '1' to '10'
  }
  formData.append('passoutYear', values.passoutYear);

  for (let i = 0; i < values.technologies.length; i++) {
    formData.append('technologies', values.technologies[i]);
  }
  for (let i = 0; i < values.durations.length; i++) {
    formData.append('durations', values.durations[i]);
  }
  for (let i = 0; i < values.letters.length; i++) {
    formData.append('letters', values.letters[i]);
  }
  formData.append('projectIncluded', values.projectIncluded);
  formData.append('internshipType', values.internshipType);
  formData.append('location', values.location);
  formData.append('mode', values.mode);
  formData.append('reference', buildReferenceText(values));

  // Only the documents on this student's form (a pursuing student has no course certificate)
  const documents = getDocumentsFor(values.educationStatus);
  for (let i = 0; i < documents.length; i++) {
    const name = documents[i].name;
    if (files[name]) {
      formData.append(name, files[name]);
    }
  }

  formData.append('declarationAccepted', values.declarationAccepted ? 'true' : 'false');

  return formData;
}

// Where the backend runs.
// - Empty (default): same website, e.g. /api/applications. In development Vite forwards /api to
//   http://localhost:5000 (see vite.config.js). In production the backend serves the frontend.
// - Set VITE_API_URL in frontend/.env only if the API is on a different domain.
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Shown when the phone / computer has no internet at all
const OFFLINE_MESSAGE = 'You seem to be offline. Please check your internet connection and press Submit again.';

// Shown when the internet works but our server did not answer, even after waiting for it
const SERVER_BUSY_MESSAGE =
  'Our server is not responding right now. Your answers are still here: please wait a minute and press Submit again.';

// Shown when the server is awake but the upload still did not go through after every try
const FILE_PROBLEM_MESSAGE =
  'The application could not be sent this time. Your answers and documents are still here: please press Submit again.';

// Our free server (Render) sleeps when nobody used it for a while. Waking up takes about a minute,
// so we wait up to this long for it before giving up.
const WAKE_UP_WAIT_MS = 90 * 1000;
const WAKE_UP_CHECK_EVERY_MS = 5 * 1000;

// Gateway answers while the server is starting / restarting
const SERVER_STARTING_STATUSES = [502, 503, 504];

function wait(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

// A random key for one application. If the browser has to send the form again,
// the server sees the same key and does not save the application twice.
export function makeSubmissionKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'k-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
}

// Asks the server "are you awake?" until it says yes (true) or we have waited long enough (false)
async function waitForServer() {
  const giveUpAt = Date.now() + WAKE_UP_WAIT_MS;
  while (Date.now() < giveUpAt) {
    try {
      const response = await fetch(API_BASE_URL + '/api/health', { cache: 'no-store' });
      if (response.ok) {
        return true;
      }
    } catch {
      // still sleeping, try again
    }
    await wait(WAKE_UP_CHECK_EVERY_MS);
  }
  return false;
}

// One try. Returns the response, or null when the server could not be reached (or is still starting).
async function postApplication(formData) {
  try {
    const response = await fetch(API_BASE_URL + '/api/applications', {
      method: 'POST',
      body: formData, // the browser sets the multipart Content-Type header itself
    });
    if (SERVER_STARTING_STATUSES.includes(response.status)) {
      return null;
    }
    return response;
  } catch {
    return null;
  }
}

/**
 * Sends the application (fields + documents) to the backend.
 * submissionKey: from makeSubmissionKey(), the same for every try of this application.
 * onWaiting(): called when the server did not answer and we wait for it to wake up (to show a message).
 * Returns { referenceNo } on success.
 * On failure it throws an Error; `error.fieldErrors` holds messages for specific fields.
 */
export async function submitApplication(values, files, submissionKey, onWaiting) {
  const formData = buildApplicationFormData(values, files);
  if (submissionKey) {
    formData.append('submissionKey', submissionKey);
  }

  // Demo preview: show the success screen without sending anything
  if (IS_DEMO_MODE) {
    await wait(1200);
    const randomPart = Math.random().toString(16).slice(2, 8).toUpperCase();
    return { referenceNo: 'DEMO-' + randomPart };
  }

  if (isOffline()) {
    throw new Error(OFFLINE_MESSAGE);
  }

  let response = await postApplication(formData);

  // No answer: usually the server was asleep. Wait for it to wake up, then send once more.
  // (The same submissionKey is sent, so the server never saves the application twice.)
  if (!response) {
    if (isOffline()) {
      throw new Error(OFFLINE_MESSAGE);
    }
    if (onWaiting) {
      onWaiting();
    }
    const isAwake = await waitForServer();
    if (!isAwake) {
      throw new Error(isOffline() ? OFFLINE_MESSAGE : SERVER_BUSY_MESSAGE);
    }
    // Send again (up to 2 more times, a few seconds apart) before asking the student to do anything
    for (let attempt = 1; attempt <= 2 && !response; attempt++) {
      response = await postApplication(formData);
      if (!response && attempt < 2) {
        await wait(3000);
      }
    }
    if (!response) {
      throw new Error(isOffline() ? OFFLINE_MESSAGE : FILE_PROBLEM_MESSAGE);
    }
  }

  let result = null;
  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok || !result || !result.success) {
    let message = 'Something went wrong. Please try again in a few minutes.';
    if (result && result.message) {
      message = result.message;
    }
    const error = new Error(message);
    error.fieldErrors = result && result.errors ? result.errors : {};
    throw error;
  }

  return { referenceNo: result.data.referenceNo };
}
