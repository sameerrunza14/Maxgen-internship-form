import { STEPS } from '../../constants/formOptions';

function StepCircle({ index, currentStep, completed }) {
  if (completed && index !== currentStep) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white">
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 111.4-1.4l2.8 2.79 6.8-6.8a1 1 0 011.4 0z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    );
  }

  if (index === currentStep) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-accent-500 bg-white text-sm font-bold text-accent-600 shadow-[0_0_0_4px_var(--color-accent-50)]">
        {index + 1}
      </span>
    );
  }

  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-semibold text-slate-400">
      {index + 1}
    </span>
  );
}

/**
 * Vertical step list (desktop sidebar).
 * A step can be clicked only if it was already reached before.
 */
export function StepperSidebar({ currentStep, highestStep, onStepClick }) {
  return (
    <nav aria-label="Application steps">
      <ol>
        {STEPS.map(function (step, index) {
          const completed = index < highestStep || index < currentStep;
          const reachable = index <= highestStep;
          const isLast = index === STEPS.length - 1;

          return (
            <li key={step.title} className="relative">
              {!isLast && (
                <span
                  className={
                    'absolute left-4 top-10 -ml-px h-[calc(100%-2.75rem)] w-0.5 rounded ' +
                    (index < highestStep ? 'bg-brand-700' : 'bg-slate-200')
                  }
                  aria-hidden="true"
                />
              )}
              <button
                type="button"
                disabled={!reachable}
                onClick={function () {
                  onStepClick(index);
                }}
                aria-current={index === currentStep ? 'step' : undefined}
                className="group flex w-full items-start gap-3 rounded-lg pb-7 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:cursor-default"
              >
                <StepCircle index={index} currentStep={currentStep} completed={completed} />
                <span className="pt-1">
                  <span
                    className={
                      'block text-sm font-semibold ' +
                      (index === currentStep
                        ? 'text-slate-900'
                        : reachable
                          ? 'text-slate-700 group-hover:text-brand-700'
                          : 'text-slate-400')
                    }
                  >
                    {step.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-slate-500">{step.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Compact progress bar (mobile and tablet)
export function StepperMobile({ currentStep }) {
  const percent = Math.round(((currentStep + 1) / STEPS.length) * 100);

  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="uppercase tracking-wide text-accent-600">
          Step {currentStep + 1} of {STEPS.length}
        </span>
        {currentStep < STEPS.length - 1 && (
          <span className="text-slate-500">Next: {STEPS[currentStep + 1].short}</span>
        )}
      </div>
      <div className="mt-2 flex gap-1.5" aria-hidden="true">
        {STEPS.map(function (step, index) {
          return (
            <span
              key={step.title}
              className={'h-1.5 flex-1 rounded-full transition-colors ' + (index <= currentStep ? 'bg-brand-700' : 'bg-slate-200')}
            />
          );
        })}
      </div>
      <span className="sr-only">{percent}% complete</span>
    </div>
  );
}
