import { useEffect, useRef, useState } from 'react';
import { TopBar, Hero, PageFooter } from './layout/PageHeader';
import FaqSection from './layout/FaqSection';
import { StepperSidebar, StepperMobile } from './layout/Stepper';
import SuccessScreen from './layout/SuccessScreen';
import PersonalStep from './steps/PersonalStep';
import EducationStep from './steps/EducationStep';
import InternshipStep from './steps/InternshipStep';
import DocumentsStep from './steps/DocumentsStep';
import ReviewStep from './steps/ReviewStep';
import { STEPS, PASSOUT_DURATION, DOCUMENTS, getPassoutYearOptions } from '../constants/formOptions';
import { validateField, validateStep, findFirstStepWithError } from '../utils/validation';
import { submitApplication, makeSubmissionKey } from '../services/applicationApi';
import { IS_DEMO_MODE } from '../config/demoMode';
import { getFormConfig, loadFormConfig } from '../config/formConfig';

// After the settings arrive from the server: drop saved answers that are no longer allowed
// (a technology that was removed, too many technologies, a passout year out of range)
function cleanAnswersForConfig(values, config) {
  const allowed = [];
  for (let i = 0; i < config.technologies.length; i++) {
    allowed.push(config.technologies[i].value);
  }
  const technologies = values.technologies
    .filter(function (name) {
      return allowed.includes(name);
    })
    .slice(0, config.maxTechnologies);

  let passoutYear = values.passoutYear;
  const yearOptions = getPassoutYearOptions(config.passoutYearsAhead, values.educationStatus);
  let isYearAllowed = false;
  for (let i = 0; i < yearOptions.length; i++) {
    if (yearOptions[i].value === passoutYear) {
      isYearAllowed = true;
    }
  }
  if (!isYearAllowed) {
    passoutYear = '';
  }

  if (technologies.length === values.technologies.length && passoutYear === values.passoutYear) {
    return values; // nothing changed
  }
  return { ...values, technologies: technologies, passoutYear: passoutYear };
}

const DRAFT_KEY = 'maxgen-internship-draft';
// The furthest step the student reached, so they can go back there after a refresh
const DRAFT_STEP_KEY = 'maxgen-internship-draft-step';
// Documents step: files cannot be saved in the browser, so a restored draft goes back here at most
const DOCUMENTS_STEP = 3;

const EMPTY_VALUES = {
  // Personal information
  fullName: '',
  email: '',
  contactNumber: '',
  parentContactNumber: '',
  gender: '',
  address: '',
  // Education background
  educationStatus: '', // 'pursuing' (still studying) or 'passout' (finished)
  qualification: '',
  qualificationOther: '',
  specialization: '',
  institute: '', // college / university name
  trainingCenter: '', // only passout: training center / company name (optional)
  semester: '', // only pursuing
  passoutYear: '',
  // Internship details
  internshipType: '',
  technologies: [],
  durations: [],
  letters: [],
  projectIncluded: '',
  location: '',
  mode: '',
  referenceSource: '',
  referenceDetail: '',
  // Declaration
  declarationAccepted: false,
};

const EMPTY_FILES = {};
for (let i = 0; i < DOCUMENTS.length; i++) {
  EMPTY_FILES[DOCUMENTS[i].name] = null;
}

// Text answers are saved in the browser so a refresh doesn't lose them. Files cannot be saved.
function loadDraft() {
  try {
    const saved = window.localStorage.getItem(DRAFT_KEY);
    if (!saved) {
      return null;
    }
    const parsed = JSON.parse(saved);
    const values = { ...EMPTY_VALUES };
    for (const key of Object.keys(EMPTY_VALUES)) {
      if (parsed[key] !== undefined && typeof parsed[key] === typeof EMPTY_VALUES[key]) {
        values[key] = parsed[key];
      }
    }
    if (!Array.isArray(values.letters)) {
      values.letters = [];
    }
    if (values.educationStatus !== 'pursuing' && values.educationStatus !== 'passout') {
      values.educationStatus = '';
    }
    // A passout year saved earlier may now be outside the allowed years: ask again
    const allowedYears = getPassoutYearOptions(undefined, values.educationStatus);
    let isYearAllowed = false;
    for (let i = 0; i < allowedYears.length; i++) {
      if (allowedYears[i].value === values.passoutYear) {
        isYearAllowed = true;
      }
    }
    if (!isYearAllowed) {
      values.passoutYear = '';
    }
    if (!Array.isArray(values.technologies)) {
      values.technologies = [];
    }
    if (!Array.isArray(values.durations)) {
      values.durations = [];
    }
    // Drafts saved before multi-select had one technology / duration as text
    if (values.technologies.length === 0 && typeof parsed.technology === 'string' && parsed.technology) {
      values.technologies = [parsed.technology];
    }
    if (values.durations.length === 0 && typeof parsed.duration === 'string' && parsed.duration) {
      values.durations = [parsed.duration];
    }
    if (values.educationStatus === 'passout') {
      values.durations = [PASSOUT_DURATION];
      values.semester = '';
    }
    values.declarationAccepted = false;
    return values;
  } catch {
    return null;
  }
}

function saveDraft(values) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
  } catch {
    // Storage can be blocked (private mode). The form still works without it.
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
    window.localStorage.removeItem(DRAFT_STEP_KEY);
  } catch {
    // ignore
  }
}

// Only moves forward: going back to step 2 after a refresh keeps "reached step 4"
function saveDraftStep(stepIndex) {
  try {
    const saved = Number(window.localStorage.getItem(DRAFT_STEP_KEY)) || 0;
    if (stepIndex <= saved) {
      return;
    }
    window.localStorage.setItem(DRAFT_STEP_KEY, String(stepIndex));
  } catch {
    // ignore
  }
}

// The step the student reached last time (0 = none). Never past Documents: files must be uploaded again.
function loadDraftStep() {
  try {
    const step = Number(window.localStorage.getItem(DRAFT_STEP_KEY));
    if (!Number.isInteger(step) || step < 1) {
      return 0;
    }
    return Math.min(step, DOCUMENTS_STEP);
  } catch {
    return 0;
  }
}

function hasAnyValue(values) {
  for (const key of Object.keys(values)) {
    const value = values[key];
    if (typeof value === 'string' && value !== '') return true;
    if (Array.isArray(value) && value.length > 0) return true;
  }
  return false;
}

function ApplicationPage() {
  const [values, setValues] = useState(function () {
    return loadDraft() || EMPTY_VALUES;
  });
  const [files, setFiles] = useState(EMPTY_FILES);
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [highestStep, setHighestStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState(null);
  const [draftRestored] = useState(function () {
    return loadDraft() !== null;
  });
  // Where the student stopped last time (e.g. 3 = Documents), for the "Continue where you left off" button
  const [savedStep] = useState(loadDraftStep);

  // Settings from the admin panel (open / closed, technologies …). Starts with the built-in values.
  const [formConfig, setFormConfig] = useState(getFormConfig());

  useEffect(function () {
    loadFormConfig().then(function (config) {
      setFormConfig(config);
      setValues(function (current) {
        return cleanAnswersForConfig(current, config);
      });
    });
  }, []);

  // True while we wait for the sleeping server to wake up (shows a "please wait" message)
  const [isWaitingForServer, setIsWaitingForServer] = useState(false);
  // One key per application: if the form has to be sent again, the server does not save it twice.
  // A new key is made only after a successful submit or "Start fresh".
  const submissionKeyRef = useRef(null);
  if (submissionKeyRef.current === null) {
    submissionKeyRef.current = makeSubmissionKey();
  }

  const cardRef = useRef(null);
  const headingRef = useRef(null);
  const isFirstRender = useRef(true);

  // Save the draft whenever an answer changes
  useEffect(
    function () {
      if (result) {
        return;
      }
      if (hasAnyValue(values)) {
        saveDraft(values);
      }
    },
    [values, result]
  );

  // When the step changes: scroll to the top of the card and move focus to the step title
  useEffect(
    function () {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
      if (cardRef.current) {
        cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (headingRef.current) {
        headingRef.current.focus({ preventScroll: true });
      }
    },
    [currentStep, result]
  );

  // ---------- helpers ----------
  function setFieldError(name, message) {
    setErrors(function (previous) {
      const next = { ...previous };
      if (message) {
        next[name] = message;
      } else {
        delete next[name];
      }
      return next;
    });
  }

  function updateValue(name, value) {
    setValues(function (previous) {
      const next = { ...previous, [name]: value };

      // Reset fields that depend on this answer
      if (name === 'referenceSource') {
        next.referenceDetail = '';
      }
      if (name === 'qualification' && value !== 'Other') {
        next.qualificationOther = '';
      }
      // Pursuing <-> Passout: the years, semester and durations are different, so ask again
      if (name === 'educationStatus' && value !== previous.educationStatus) {
        next.passoutYear = '';
        if (value === 'passout') {
          next.semester = '';
          next.durations = [PASSOUT_DURATION];
        } else {
          next.trainingCenter = '';
          next.durations = [];
        }
      }
      // Passout students always have the 3 – 6 months duration
      if (name === 'durations' && next.educationStatus === 'passout') {
        next.durations = [PASSOUT_DURATION];
      }
      return next;
    });
    setFieldError(name, '');
    setSubmitError('');

    // A pursuing student does not upload the passout-only documents (course certificate)
    if (name === 'educationStatus' && value !== 'passout') {
      setFiles(function (previous) {
        const next = { ...previous };
        for (let i = 0; i < DOCUMENTS.length; i++) {
          if (DOCUMENTS[i].onlyPassout) {
            next[DOCUMENTS[i].name] = null;
          }
        }
        return next;
      });
    }
    if (name === 'educationStatus') {
      setErrors(function (previous) {
        const next = { ...previous };
        delete next.passoutYear;
        delete next.semester;
        delete next.durations;
        delete next.collegeId;
        return next;
      });
    }
  }

  function scrollToFirstError() {
    window.requestAnimationFrame(function () {
      const card = cardRef.current;
      if (!card) {
        return;
      }
      const firstError = card.querySelector('[aria-invalid="true"], [role="alert"]');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (firstError.tagName === 'INPUT' || firstError.tagName === 'SELECT' || firstError.tagName === 'TEXTAREA') {
          firstError.focus({ preventScroll: true });
        }
      }
    });
  }

  // ---------- field events ----------
  function handleChange(event) {
    updateValue(event.target.name, event.target.value);
  }

  function handleBlur(event) {
    const name = event.target.name;
    // Only check fields the user has typed in. Empty required fields are reported on "Continue".
    if (values[name] !== '' || errors[name]) {
      setFieldError(name, validateField(name, values, files));
    }
  }

  function handleFileSelect(name, file) {
    setFiles(function (previous) {
      return { ...previous, [name]: file };
    });
    setFieldError(name, '');
  }

  function handleFileRemove(name) {
    setFiles(function (previous) {
      return { ...previous, [name]: null };
    });
  }

  // ---------- navigation ----------
  function goToStep(stepIndex) {
    setCurrentStep(stepIndex);
    if (stepIndex > highestStep) {
      setHighestStep(stepIndex);
      saveDraftStep(stepIndex);
    }
  }

  // "Continue where you left off": checks the earlier steps one by one and goes to the saved step.
  // If an earlier step has a missing answer, it stops there and shows what to fill.
  function continueFromSavedStep() {
    for (let step = currentStep; step < savedStep; step++) {
      const stepErrors = validateStep(step, values, files);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(function (previous) {
          return { ...previous, ...stepErrors };
        });
        setCurrentStep(step);
        if (step > highestStep) {
          setHighestStep(step);
        }
        scrollToFirstError();
        return;
      }
    }
    setCurrentStep(savedStep);
    if (savedStep > highestStep) {
      setHighestStep(savedStep);
    }
  }

  function handleNext() {
    const stepErrors = validateStep(currentStep, values, files);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(function (previous) {
        return { ...previous, ...stepErrors };
      });
      scrollToFirstError();
      return;
    }
    goToStep(currentStep + 1);
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  function handleStepClick(stepIndex) {
    if (stepIndex <= highestStep) {
      setCurrentStep(stepIndex);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // Enter key on earlier steps should behave like "Continue"
    if (currentStep < STEPS.length - 1) {
      handleNext();
      return;
    }

    // Check every step once more before submitting
    let allErrors = {};
    for (let step = 0; step < STEPS.length; step++) {
      allErrors = { ...allErrors, ...validateStep(step, values, files) };
    }
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      const stepWithError = findFirstStepWithError(allErrors);
      if (stepWithError !== currentStep) {
        setCurrentStep(stepWithError);
      }
      scrollToFirstError();
      return;
    }

    setIsSubmitting(true);
    setIsWaitingForServer(false);
    setSubmitError('');
    try {
      const response = await submitApplication(values, files, submissionKeyRef.current, function () {
        setIsWaitingForServer(true);
      });
      submissionKeyRef.current = makeSubmissionKey();
      clearDraft();
      setResult({ referenceNo: response.referenceNo, fullName: values.fullName, email: values.email });
    } catch (error) {
      if (error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
        setErrors(error.fieldErrors);
        const stepWithError = findFirstStepWithError(error.fieldErrors);
        if (stepWithError >= 0) {
          setCurrentStep(stepWithError);
        }
        scrollToFirstError();
      }
      setSubmitError(error.message || 'Something went wrong. Please try again in a minute.');
    } finally {
      setIsSubmitting(false);
      setIsWaitingForServer(false);
    }
  }

  function resetForm() {
    clearDraft();
    submissionKeyRef.current = makeSubmissionKey();
    setValues(EMPTY_VALUES);
    setFiles(EMPTY_FILES);
    setErrors({});
    setSubmitError('');
    setResult(null);
    setHighestStep(0);
    setCurrentStep(0);
  }

  // ---------- render ----------
  const stepProps = {
    values: values,
    errors: errors,
    files: files,
    onChange: handleChange,
    onValueChange: updateValue,
    onBlur: handleBlur,
  };

  let stepContent = null;
  if (currentStep === 0) stepContent = <PersonalStep {...stepProps} />;
  if (currentStep === 1) stepContent = <EducationStep {...stepProps} />;
  if (currentStep === 2) stepContent = <InternshipStep {...stepProps} />;
  if (currentStep === 3) {
    stepContent = (
      <DocumentsStep
        educationStatus={values.educationStatus}
        files={files}
        errors={errors}
        onFileSelect={handleFileSelect}
        onFileRemove={handleFileRemove}
        onFileError={setFieldError}
      />
    );
  }
  if (currentStep === 4) {
    stepContent = <ReviewStep {...stepProps} onEdit={handleStepClick} />;
  }

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="min-h-screen">
      {IS_DEMO_MODE && (
        <div className="bg-amber-100 px-4 py-2 text-center text-[13px] font-medium text-amber-900">
          Demo preview — applications submitted here are not saved.
        </div>
      )}
      <TopBar />
      <Hero selectedTechnologies={values.technologies} />

      <main className="relative z-10 mx-auto -mt-14 max-w-6xl px-3 sm:-mt-16 sm:px-6">
        <div
          ref={cardRef}
          className="scroll-mt-20 overflow-hidden sm:scroll-mt-24 rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06),0_20px_50px_-24px_rgba(20,33,64,0.35)] ring-1 ring-slate-200/70"
        >
          {!formConfig.applicationsOpen && !result ? (
            <div className="px-6 py-14 text-center sm:px-10 sm:py-20">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" strokeLinecap="round" />
                </svg>
              </span>
              <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900">Applications are closed</h2>
              <p className="mx-auto mt-2 max-w-md whitespace-pre-line text-[15px] leading-relaxed text-slate-600">{formConfig.closedMessage}</p>
            </div>
          ) : result ? (
            <SuccessScreen
              name={result.fullName}
              email={result.email}
              referenceNo={result.referenceNo}
              onStartAgain={resetForm}
            />
          ) : (
            <div className="grid lg:grid-cols-[290px_1fr]">
              {/* Sidebar (desktop) */}
              <aside className="hidden border-r border-slate-200 bg-slate-50/70 px-6 py-8 lg:block">
                <StepperSidebar currentStep={currentStep} highestStep={highestStep} onStepClick={handleStepClick} />

                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-800">Keep these ready</p>
                  <ul className="mt-3 space-y-2 text-[13px] text-slate-600">
                    <li className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                      Aadhaar or PAN card
                    </li>
                    <li className="flex gap-2">
                      <span
                        className={
                          'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ' +
                          (values.educationStatus === 'passout' ? 'bg-slate-300' : 'bg-accent-500')
                        }
                      />
                      {values.educationStatus === 'passout' ? 'College ID card (optional)' : 'College ID card'}
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                      Resume in PDF format
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                      Passport photo (optional)
                    </li>
                    {values.educationStatus === 'passout' && (
                      <li className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                        Course / internship certificate (optional)
                      </li>
                    )}
                  </ul>
                  <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    Up to 500 KB per file (photo 200 KB)
                  </p>
                </div>
              </aside>

              {/* Form */}
              <form onSubmit={handleSubmit} noValidate className="flex min-w-0 flex-col">
                <div className="flex-1 px-4 py-6 sm:px-8 sm:py-9">
                  <StepperMobile currentStep={currentStep} />

                  <div className="mt-6 lg:mt-0">
                    <p className="hidden text-sm font-semibold text-accent-600 lg:block">
                      Step {currentStep + 1} of {STEPS.length}
                    </p>
                    <h2
                      ref={headingRef}
                      tabIndex={-1}
                      className="mt-1 text-xl font-bold tracking-tight text-slate-900 focus:outline-none sm:text-2xl"
                    >
                      {STEPS[currentStep].title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">{STEPS[currentStep].description}</p>
                  </div>

                  {draftRestored && currentStep === 0 && hasAnyValue(values) && (
                    <div className="mt-5 rounded-lg bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-900 ring-1 ring-amber-200">
                      <p className="font-semibold">Your answers are saved. No need to start fresh.</p>
                      <p className="mt-1 text-amber-800">
                        If you opened another page or refreshed while filling the form, your answers are still here.
                        {savedStep > 0
                          ? ' Continue from where you left off, or press Continue to check each step.'
                          : ' Press Continue to go on from where you left off.'}{' '}
                        Documents must be uploaded again, because files cannot be saved on this device.
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                        {savedStep > 0 && (
                          <button
                            type="button"
                            onClick={continueFromSavedStep}
                            className="rounded-lg bg-amber-600 px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-amber-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/30"
                          >
                            Continue from Step {savedStep + 1}: {STEPS[savedStep].short} →
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={resetForm}
                          className="font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900"
                        >
                          Start fresh (clear all answers)
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-7">{stepContent}</div>

                  {isWaitingForServer && (
                    <div role="status" className="mt-6 flex items-start gap-3 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                        <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      <span>
                        <span className="font-semibold">Connecting to our server, please wait…</span>
                        <br />
                        This can take up to a minute. Please do not close or refresh this page. Your application will be
                        sent automatically.
                      </span>
                    </div>
                  )}

                  {submitError && (
                    <div role="alert" className="mt-6 rounded-lg border border-accent-100 bg-accent-50 px-4 py-3 text-sm text-accent-600">
                      {submitError}
                    </div>
                  )}
                </div>

                {/* Footer buttons */}
                <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-8 sm:py-4">
                  {currentStep > 0 ? (
                    <button
                      type="button"
                      onClick={handleBack}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20 disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d="M12.8 15.3a.75.75 0 01-1.06-.02l-4.5-4.75a.75.75 0 010-1.04l4.5-4.75a.75.75 0 111.08 1.04L8.82 10l4 4.25a.75.75 0 01-.02 1.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Back
                    </button>
                  ) : (
                    <span className="hidden text-xs text-slate-400 sm:block">
                      <span className="text-accent-500">*</span> Required fields
                    </span>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={
                      'ml-auto inline-flex min-w-[150px] flex-1 items-center justify-center gap-2 rounded-lg px-6 py-3.5 text-[15px] font-semibold sm:flex-none sm:py-3 sm:text-sm text-white shadow-sm transition ' +
                      'focus:outline-none focus-visible:ring-4 disabled:cursor-wait disabled:opacity-80 ' +
                      (isLastStep
                        ? 'bg-accent-500 hover:bg-accent-600 focus-visible:ring-accent-500/30'
                        : 'bg-brand-700 hover:bg-brand-800 focus-visible:ring-brand-600/30')
                    }
                  >
                    {isSubmitting && (
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                        <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    )}
                    {isSubmitting ? (isWaitingForServer ? 'Please wait…' : 'Submitting…') : isLastStep ? 'Submit Application' : 'Continue'}
                    {!isSubmitting && !isLastStep && (
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d="M7.2 4.7a.75.75 0 011.06.02l4.5 4.75a.75.75 0 010 1.04l-4.5 4.75a.75.75 0 11-1.08-1.04L11.18 10l-4-4.25a.75.75 0 01.02-1.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {!result && <FaqSection />}
      {result && <div className="h-14" />}

      <PageFooter />
    </div>
  );
}

export default ApplicationPage;
