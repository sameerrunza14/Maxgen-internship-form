const NEXT_STEPS = [
  { title: 'Application review', text: 'Our HR team checks your details and documents.' },
  { title: 'We contact you', text: 'You will get a call or email on the details you shared.' },
  { title: 'Get started', text: 'Once selected, you receive your offer letter and joining details.' },
];

function SuccessScreen({ name, email, referenceNo, onStartAgain }) {
  let firstName = name.trim();
  if (firstName.indexOf(' ') > 0) {
    firstName = firstName.slice(0, firstName.indexOf(' '));
  }

  return (
    <div className="px-5 py-10 text-center sm:px-10 sm:py-14" role="status" aria-live="polite">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/60">
        <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        Thank you, {firstName}!
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[15px] text-slate-600">
        Your internship application has been submitted successfully. Our team will get in touch with you at{' '}
        <span className="font-semibold text-slate-800">{email}</span>.
      </p>

      <div className="mx-auto mt-6 inline-flex flex-col items-center rounded-xl border border-dashed border-brand-300 bg-brand-50 px-6 py-3">
        <span className="text-[13px] font-medium text-brand-600">Your application ID</span>
        <span className="mt-1 font-mono text-lg font-bold tracking-wider text-brand-800">{referenceNo}</span>
      </div>
      <p className="mt-2 text-xs text-slate-500">Please keep this ID for future communication.</p>

      <div className="mx-auto mt-10 max-w-2xl text-left">
        <h3 className="text-base font-bold text-slate-900">What happens next</h3>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {NEXT_STEPS.map(function (step, index) {
            return (
              <li key={step.title} className="rounded-xl border border-slate-200 bg-white p-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
                  {index + 1}
                </span>
                <p className="mt-3 text-sm font-semibold text-slate-800">{step.title}</p>
                <p className="mt-1 text-[13px] leading-snug text-slate-500">{step.text}</p>
              </li>
            );
          })}
        </ol>
      </div>

      <button
        type="button"
        onClick={onStartAgain}
        className="mt-10 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20"
      >
        Submit another application
      </button>
    </div>
  );
}

export default SuccessScreen;
