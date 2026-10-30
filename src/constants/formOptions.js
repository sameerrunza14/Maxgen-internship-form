// All options shown in the form.
// IMPORTANT: the `value` strings must stay the same as backend/src/constants/applicationOptions.js

export const GENDERS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
];

export const QUALIFICATIONS = [
  'BCA',
  'MCA',
  'B.Tech / B.E.',
  'M.Tech / M.E.',
  'B.Sc (IT / CS)',
  'M.Sc (IT / CS)',
  'BBA',
  'MBA',
  'Diploma',
  'Other',
];

export const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export const TECHNOLOGIES = [
  { value: 'Software Testing (QA)', label: 'Software Testing (QA)', description: 'Manual & automation testing' },
  { value: 'MERN Stack / Full Stack', label: 'MERN / Full Stack', description: 'MongoDB, Express, React, Node' },
  { value: 'React JS', label: 'React JS', description: 'Modern frontend development' },
  { value: 'Node JS', label: 'Node JS', description: 'Server-side JavaScript & APIs' },
  { value: 'Python Django', label: 'Python Django', description: 'Backend web development' },
  { value: 'Java', label: 'Java', description: 'Core & advanced Java' },
  { value: 'UI/UX Design', label: 'UI / UX Design', description: 'Figma, wireframes, prototypes' },
  { value: 'AWS / DevOps', label: 'AWS / DevOps', description: 'Cloud, CI/CD, deployment' },
  { value: 'AI / ML', label: 'AI / ML', description: 'Machine learning models' },
  { value: 'Data Scientist', label: 'Data Scientist', description: 'DSA & problem solving' },
  { value: 'Data Analytics', label: 'Data Analytics', description: 'Excel, SQL, Power BI, Python' },
  { value: 'Generative AI', label: 'Generative AI', description: 'LLMs, prompts, AI apps' },
  { value: 'Cyber Security', label: 'Cyber Security', description: 'Networks & ethical hacking' },
  { value: 'Flutter', label: 'Flutter', description: 'Cross-platform mobile apps' },
];

export const DURATIONS = [
  { value: '15 Days', label: '15 Days', description: 'Short-term' },
  { value: '1 Month', label: '1 Month', description: '30 days' },
  { value: '45 Days', label: '45 Days', description: '1.5 months' },
  { value: '3 Months', label: '3 Months', description: '90 days' },
  { value: '3 to 4 Months', label: '3 – 4 Months', description: 'Min 3, max 4 months' },
  { value: '3 to 6 Months', label: '3 – 6 Months', description: 'Min 3, max 6 months' },
];

export const LETTER_TYPES = [
  { value: 'Offer Letter', label: 'Offer Letter', description: 'Issued when you join' },
  { value: 'Completion Certificate', label: 'Completion Certificate', description: 'After you finish the internship' },
  { value: 'Experience Letter', label: 'Experience Letter', description: 'Describes your work and role' },
  { value: 'Progress Report', label: 'Progress Reports', description: 'Periodic performance reports' },
];

export const LOCATIONS = [
  { value: 'Ahmedabad', label: 'Ahmedabad', description: 'Gujarat' },
  { value: 'Pune', label: 'Pune', description: 'Maharashtra' },
  { value: 'Mumbai', label: 'Mumbai', description: 'Maharashtra' },
];

export const INTERNSHIP_MODES = [
  { value: 'Online', label: 'Online', description: 'Intern remotely' },
  { value: 'Offline', label: 'Offline', description: 'At our office' },
  { value: 'Hybrid', label: 'Hybrid', description: 'Mix of both' },
];

// Same options as the printed (physical) application form
export const REFERENCE_SOURCES = [
  { value: 'Indeed', label: 'Indeed' },
  { value: 'Shine', label: 'Shine' },
  { value: 'TimesJobs.com', label: 'TimesJobs.com' },
  { value: 'Google Search', label: 'Google Search' },
  { value: 'Ref. from Friends', label: 'Ref. from Friends' },
  { value: 'Naukri.com', label: 'Naukri.com' },
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'Any Other', label: 'Any Other' },
];

// These two reference options need a little extra text
export const REFERENCE_DETAIL_LABELS = {
  'Ref. from Friends': { label: "Friend's Name", placeholder: 'Name of the friend who referred you' },
  'Any Other': { label: 'Please Specify', placeholder: 'Where did you hear about us?' },
};

export const MAX_FILE_SIZE_MB = 2;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Every document the applicant uploads. The key is the field name sent to the backend.
export const DOCUMENTS = [
  {
    name: 'idProof',
    label: 'Aadhaar Card / PAN Card',
    required: true,
    accept: '.pdf,.jpg,.jpeg,.png',
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    allowedLabel: 'PDF, JPG or PNG',
  },
  {
    name: 'collegeId',
    label: 'College ID Card',
    required: false,
    accept: '.pdf,.jpg,.jpeg,.png',
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    allowedLabel: 'PDF, JPG or PNG',
  },
  {
    name: 'resume',
    label: 'Resume / CV',
    required: true,
    accept: '.pdf',
    allowedTypes: ['application/pdf'],
    allowedLabel: 'PDF',
  },
  {
    name: 'photo',
    label: 'Passport Size Photo',
    required: false,
    accept: '.jpg,.jpeg,.png',
    allowedTypes: ['image/jpeg', 'image/png'],
    allowedLabel: 'JPG or PNG',
  },
];

export const DECLARATION_TEXT =
  "I hereby declare that the information provided above is true and correct to the best of my knowledge. " +
  'If I am not selected, I agree not to disclose any information regarding the company’s internship process, ' +
  'internal policies, or other confidential information. I understand that if I violate this policy, the company ' +
  'has the legal right to claim compensation for any financial loss incurred and to take appropriate legal action.';

// The 5 steps of the form
export const STEPS = [
  { title: 'Personal Information', short: 'Personal', description: 'Tell us who you are and how to reach you.' },
  { title: 'Education Background', short: 'Education', description: 'Your current or most recent education.' },
  { title: 'Internship Details', short: 'Internship', description: 'Choose the program that fits you.' },
  { title: 'Documents', short: 'Documents', description: `Upload clear copies. Max ${MAX_FILE_SIZE_MB} MB per file.` },
  { title: 'Review & Submit', short: 'Review', description: 'Check your details and accept the declaration.' },
];

// Semester options: 1st to 10th (this form is only for students who are currently studying)
export function getSemesterOptions() {
  const suffixes = ['st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th', 'th'];
  const options = [];
  for (let number = 1; number <= 10; number++) {
    options.push({ value: String(number), label: number + suffixes[number - 1] + ' Semester' });
  }
  return options;
}

// Passout year options: this year and the next 10 years (e.g. 2026 to 2036)
export function getPassoutYearOptions() {
  const currentYear = new Date().getFullYear();
  const options = [];
  for (let year = currentYear; year <= currentYear + 10; year++) {
    options.push({ value: String(year), label: String(year) });
  }
  return options;
}
