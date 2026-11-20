import { DOCUMENTS, PASSOUT_DURATION, FIRST_PASSOUT_YEAR_FOR_PASSOUT, getDocumentsFor } from '../constants/formOptions';
import { getFormConfig } from '../config/formConfig';

const NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]*$/;
const PHONE_PATTERN = /^[6-9]\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Which fields belong to which step (index matches STEPS in formOptions.js)
export const STEP_FIELDS = [
  ['fullName', 'email', 'contactNumber', 'parentContactNumber', 'gender', 'address'],
  ['educationStatus', 'qualification', 'qualificationOther', 'specialization', 'institute', 'trainingCenter', 'semester', 'passoutYear'],
  ['internshipType', 'technologies', 'durations', 'letters', 'location', 'mode', 'projectIncluded', 'referenceSource', 'referenceDetail'],
  ['idProof', 'collegeId', 'resume', 'photo', 'courseCertificate'],
  ['declarationAccepted'],
];

// The document's settings for this student (required / optional depends on pursuing or passout).
// Returns null when the document is not on this student's form.
function findDocument(name, educationStatus) {
  const list = getDocumentsFor(educationStatus);
  for (let i = 0; i < list.length; i++) {
    if (list[i].name === name) {
      return list[i];
    }
  }
  return null;
}

// Is this a document field at all (for any student)?
function isDocumentField(name) {
  for (let i = 0; i < DOCUMENTS.length; i++) {
    if (DOCUMENTS[i].name === name) {
      return true;
    }
  }
  return false;
}

// Is this file type allowed for this document? Returns an error message or ''.
export function checkFileType(file, documentConfig) {
  if (!documentConfig.allowedTypes.includes(file.type)) {
    return 'Please upload a ' + documentConfig.allowedLabel + ' file.';
  }
  return '';
}

// Is this file small enough? Returns an error message or ''.
export function checkFileSize(file, documentConfig) {
  const maxBytes = documentConfig.maxSizeKB * 1024;
  if (file.size > maxBytes) {
    const sizeKB = Math.round(file.size / 1024);
    if (file.type === 'application/pdf') {
      return (
        'This PDF is ' + sizeKB + ' KB. The limit is ' + documentConfig.maxSizeKB +
        ' KB — please compress the PDF (search "compress PDF" online) and upload it again.'
      );
    }
    return 'This file is ' + sizeKB + ' KB. The limit is ' + documentConfig.maxSizeKB + ' KB.';
  }
  return '';
}

// Returns an error message for one field, or '' when the field is valid.
export function validateField(name, values, files) {
  const value = typeof values[name] === 'string' ? values[name].trim() : values[name];

  switch (name) {
    case 'fullName':
      if (!value) return 'Please enter your full name.';
      if (value.length < 3) return 'Name looks too short.';
      if (value.length > 80) return 'Name must be 80 characters or less.';
      if (!NAME_PATTERN.test(value)) return 'Name can contain letters and spaces only.';
      return '';

    case 'email':
      if (!value) return 'Please enter your email address.';
      if (!EMAIL_PATTERN.test(value) || value.length > 120) return 'Please enter a valid email address.';
      return '';

    case 'contactNumber':
      if (!value) return 'Please enter your mobile number.';
      if (!PHONE_PATTERN.test(value)) return 'Enter a valid 10-digit mobile number.';
      return '';

    case 'parentContactNumber':
      if (!value) return "Please enter your parent's mobile number.";
      if (!PHONE_PATTERN.test(value)) return 'Enter a valid 10-digit mobile number.';
      if (value === values.contactNumber.trim()) return 'This must be different from your own number.';
      return '';

    case 'gender':
      return value ? '' : 'Please select your gender.';

    case 'address':
      if (!value) return 'Please enter your address.';
      if (value.length < 10) return 'Please enter your complete address.';
      if (value.length > 300) return 'Address must be 300 characters or less.';
      return '';

    case 'educationStatus':
      return value ? '' : 'Please choose Pursuing or Passout.';

    case 'qualification':
      return value ? '' : 'Please select your qualification.';

    case 'qualificationOther':
      if (values.qualification === 'Other' && !value) return 'Please enter your qualification.';
      return '';

    case 'specialization':
      if (value.length > 100) return 'Specialization must be 100 characters or less.';
      return '';

    case 'institute':
      if (!value) return 'Please enter your college / university name.';
      if (value.length > 150) return 'College / university name must be 150 characters or less.';
      return '';

    case 'trainingCenter':
      // Only passout students see it, and it is optional
      if (values.educationStatus === 'passout' && value.length > 150) {
        return 'Training center / company name must be 150 characters or less.';
      }
      return '';

    case 'semester':
      if (values.educationStatus === 'passout') return ''; // passout students have no current semester
      return value ? '' : 'Please select your current semester.';

    case 'passoutYear': {
      if (!value) return 'Please select your passout year.';
      const currentYear = new Date().getFullYear();
      const year = Number(value);
      if (values.educationStatus === 'passout') {
        if (year < FIRST_PASSOUT_YEAR_FOR_PASSOUT || year > currentYear) {
          return 'Passout year must be between ' + FIRST_PASSOUT_YEAR_FOR_PASSOUT + ' and ' + currentYear + '.';
        }
        return '';
      }
      const yearsAhead = getFormConfig().passoutYearsAhead;
      if (year < currentYear || year > currentYear + yearsAhead) {
        return 'Passout year must be between ' + currentYear + ' and ' + (currentYear + yearsAhead) + '.';
      }
      return '';
    }

    case 'technologies':
      if (values.technologies.length === 0) return 'Please select at least one technology.';
      const maxTechnologies = getFormConfig().maxTechnologies;
      if (values.technologies.length > maxTechnologies) return 'You can select up to ' + maxTechnologies + ' technologies.';
      return '';

    case 'durations':
      if (values.durations.length === 0) return 'Please select at least one duration.';
      if (values.educationStatus === 'passout' && (values.durations.length !== 1 || values.durations[0] !== PASSOUT_DURATION)) {
        return 'For passout students the duration is 3 – 6 months only.';
      }
      return '';

    case 'letters':
      return values.letters.length > 0 ? '' : 'Please select at least one letter.';

    case 'projectIncluded':
      return value ? '' : 'Please choose Yes or No.';

    case 'internshipType':
      return value ? '' : 'Please select the internship type.';

    case 'location':
      return value ? '' : 'Please select a location.';

    case 'mode':
      return value ? '' : 'Please select an internship mode.';

    case 'referenceSource':
      return value ? '' : 'Please tell us how you heard about us.';

    case 'referenceDetail':
      if (values.referenceSource === 'Ref. from Friends' && !value) return "Please enter your friend's name.";
      if (values.referenceSource === 'Any Other' && !value) return 'Please specify where you heard about us.';
      if (value.length > 60) return 'Please keep this under 60 characters.';
      return '';

    case 'declarationAccepted':
      return values.declarationAccepted ? '' : 'Please accept the declaration to submit.';

    default: {
      // Document fields
      if (!isDocumentField(name)) {
        return '';
      }
      const documentConfig = findDocument(name, values.educationStatus);
      if (documentConfig && documentConfig.required && !files[name]) {
        return `Please upload your ${documentConfig.label}.`;
      }
      return '';
    }
  }
}

// Validates every field of one step. Returns an object: { fieldName: 'message' }
export function validateStep(stepIndex, values, files) {
  const errors = {};
  const fields = STEP_FIELDS[stepIndex];
  for (let i = 0; i < fields.length; i++) {
    const message = validateField(fields[i], values, files);
    if (message) {
      errors[fields[i]] = message;
    }
  }
  return errors;
}

// Used when the server returns errors: find the first step that has an error.
export function findFirstStepWithError(errors) {
  for (let step = 0; step < STEP_FIELDS.length; step++) {
    const fields = STEP_FIELDS[step];
    for (let i = 0; i < fields.length; i++) {
      if (errors[fields[i]]) {
        return step;
      }
    }
  }
  return -1;
}
