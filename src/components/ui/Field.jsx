// Shared styles for text inputs, selects and textareas
export const inputClass =
  'block w-full rounded-lg border bg-white px-3.5 py-3 text-base text-slate-900 shadow-xs sm:py-2.5 sm:text-[15px] ' +
  'placeholder:text-slate-400 transition-colors duration-150 ' +
  'focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50';

export function getInputStateClass(hasError) {
  if (hasError) {
    return 'border-accent-500 focus:border-accent-500 focus:ring-accent-500/15';
  }
  return 'border-slate-300 hover:border-slate-400 focus:border-brand-600 focus:ring-brand-600/15';
}

export function FieldError({ id, message }) {
  if (!message) {
    return null;
  }
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-accent-600">
      <svg className="mt-px h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-4a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 8a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      {message}
    </p>
  );
}

// Label + input area + hint + error message
export function Field({ label, htmlFor, required, optional, hint, error, className, children, as }) {
  const LabelTag = as === 'group' ? 'span' : 'label';

  return (
    <div className={className}>
      <LabelTag
        {...(as === 'group' ? {} : { htmlFor: htmlFor })}
        className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-slate-800"
      >
        {label}
        {required && (
          <span className="text-accent-500" aria-hidden="true">
            *
          </span>
        )}
        {optional && <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>}
      </LabelTag>
      {children}
      {hint && !error && <p className="mt-1.5 text-[13px] text-slate-500">{hint}</p>}
      <FieldError id={htmlFor ? htmlFor + '-error' : undefined} message={error} />
    </div>
  );
}
