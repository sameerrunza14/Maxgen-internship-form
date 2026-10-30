import { DOCUMENTS } from '../constants/formOptions';

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

  formData.append('technology', values.technology);
  formData.append('duration', values.duration);
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

function wait(milliseconds) {
  return new Promise(function (resolve) {
    setTimeout(resolve, milliseconds);
  });
}

function makeDemoReferenceNo() {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return 'MG-' + year + '-' + random;
}

/**
 * Submits the application.
 *
 * FRONTEND ONLY (for now): nothing is sent to a server. We wait a moment, print the data
 * in the browser console and return a demo reference number.
 *
 * When the backend is ready, replace the body of this function with:
 *
 *   const response = await fetch(import.meta.env.VITE_API_URL + '/api/applications', {
 *     method: 'POST',
 *     body: formData,
 *   });
 *   const result = await response.json();
 *   if (!response.ok) {
 *     const error = new Error(result.message || 'Submission failed.');
 *     error.fieldErrors = result.errors || {};
 *     throw error;
 *   }
 *   return { referenceNo: result.data.referenceNo };
 */
export async function submitApplication(values, files) {
  const formData = buildApplicationFormData(values, files);

  await wait(1200);

  console.log('--- Application data (frontend only, not sent anywhere) ---');
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      console.log(key + ':', value.name, '(' + Math.round(value.size / 1024) + ' KB)');
    } else {
      console.log(key + ':', value);
    }
  }

  return { referenceNo: makeDemoReferenceNo() };
}
