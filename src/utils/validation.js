import { DOCUMENTS } from '../constants/formOptions';

const NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]*$/;
const PHONE_PATTERN = /^[6-9]\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Which fields belong to which step (index matches STEPS in formOptions.js)
export const STEP_FIELDS = [
  ['fullName', 'email', 'contactNumber', 'parentContactNumber', 'gender', 'address'],
  ['qualification', 'qualificationOther', 'specialization', 'institute', 'semester', 'passoutYear'],
  ['technology', 'duration', 'letters', 'location', 'mode', 'projectIncluded', 'referenceSource', 'referenceDetail'],
  ['idProof', 'collegeId', 'resume', 'photo'],
  ['declarationAccepted'],
];

function findDocument(name) {
  for (let i = 0; i < DOCUMENTS.length; i++) {
    if (DOCUMENTS[i].name === name) {
      return DOCUMENTS[i];
    }
  }
  return null;
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

    case 'qualification':
      return value ? '' : 'Please select your qualification.';

    case 'qualificationOther':
      if (values.qualification === 'Other' && !value) return 'Please enter your qualification.';
      return '';

    case 'specialization':
      if (value.length > 100) return 'Specialization must be 100 characters or less.';
      return '';

    case 'institute':
      if (!value) return 'Please enter your institute name.';
      if (value.length > 150) return 'Institute name must be 150 characters or less.';
      return '';

    case 'semester':
      return value ? '' : 'Please select your current semester.';

    case 'passoutYear':
      return value ? '' : 'Please select your passout year.';

    case 'technology':
      return value ? '' : 'Please select a technology.';

    case 'duration':
      return value ? '' : 'Please select a duration.';

    case 'letters':
      return values.letters.length > 0 ? '' : 'Please select at least one letter.';

    case 'projectIncluded':
      return value ? '' : 'Please choose Yes or No.';

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
      const documentConfig = findDocument(name);
      if (documentConfig) {
        if (documentConfig.required && !files[name]) {
          return `Please upload your ${documentConfig.label}.`;
        }
        return '';
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
