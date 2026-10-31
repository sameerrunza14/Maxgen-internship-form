import { DOCUMENTS } from '../constants/formOptions';
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

  formData.append('qualification', qualification);
  formData.append('specialization', values.specialization.trim());
  formData.append('institute', values.institute.trim());
  formData.append('semester', values.semester); // '1' to '10'
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
  formData.append('location', values.location);
  formData.append('mode', values.mode);
  formData.append('reference', buildReferenceText(values));

  for (let i = 0; i < DOCUMENTS.length; i++) {
    const name = DOCUMENTS[i].name;
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

const NETWORK_ERROR_MESSAGE =
  'Could not reach the server. Please check your internet connection and try again.';

/**
 * Sends the application (fields + documents) to the backend.
 * Returns { referenceNo } on success.
 * On failure it throws an Error; `error.fieldErrors` holds messages for specific fields.
 */
export async function submitApplication(values, files) {
  const formData = buildApplicationFormData(values, files);

  // Demo preview: show the success screen without sending anything
  if (IS_DEMO_MODE) {
    await new Promise(function (resolve) {
      setTimeout(resolve, 1200);
    });
    const randomPart = Math.random().toString(16).slice(2, 8).toUpperCase();
    return { referenceNo: 'DEMO-' + randomPart };
  }

  let response;
  try {
    response = await fetch(API_BASE_URL + '/api/applications', {
      method: 'POST',
      body: formData, // the browser sets the multipart Content-Type header itself
    });
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE);
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
