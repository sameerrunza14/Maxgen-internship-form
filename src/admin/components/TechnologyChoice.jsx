// Shown in the "Accept?" and "Mark as joined?" boxes when the student chose more than one technology.
// HR ticks the technology the student will really learn. Only the ticked ones are saved and shown in the email.
function TechnologyChoice({ technologies, selected, onChange, disabled }) {
  if (!technologies || technologies.length < 2) {
    return null;
  }

  function toggle(technology) {
    const next = [];
    for (let i = 0; i < technologies.length; i++) {
      const item = technologies[i];
      const isTicked = selected.includes(item);
      // Flip only the one that was clicked, keep the rest as they are
      if (item === technology ? !isTicked : isTicked) {
        next.push(item);
      }
    }
    onChange(next);
  }

  return (
    <div className="mt-3 rounded-lg bg-white px-3 py-2.5 ring-1 ring-amber-200">
      <p className="text-[13px] font-semibold text-slate-900">Which technology is confirmed?</p>
      <p className="mt-0.5 text-xs leading-snug text-slate-500">
        The student chose {technologies.length}. Tick only what they will learn. The email shows only the ticked ones.
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {technologies.map(function (technology) {
          const isTicked = selected.includes(technology);
          return (
            <button
              key={technology}
              type="button"
              disabled={disabled}
              aria-pressed={isTicked}
              onClick={function () {
                toggle(technology);
              }}
              className={
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition ' +
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-60 ' +
                (isTicked
                  ? 'border-brand-700 bg-brand-700 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50')
              }
            >
              {isTicked && (
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 111.4-1.4l2.8 2.79 6.8-6.8a1 1 0 011.4 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {technology}
            </button>
          );
        })}
      </div>
      {selected.length === 0 && (
        <p className="mt-2 text-xs font-medium text-accent-600">Please tick at least one technology.</p>
      )}
    </div>
  );
}

export default TechnologyChoice;
