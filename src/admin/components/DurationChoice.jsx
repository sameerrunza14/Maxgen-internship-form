import { DURATIONS } from '../../constants/formOptions';

// Shown in the "Mark as joined?" box. HR picks the duration the student is really joining for
// (e.g. chose "1 Month" on the form, joins for "3 Months"). Only one duration is saved and shown in the email.
function DurationChoice({ studentDurations, selected, onChange, disabled }) {
  // All durations on the form, plus an old one the student may have chosen that is no longer on the form
  const options = [];
  for (let i = 0; i < DURATIONS.length; i++) {
    options.push(typeof DURATIONS[i] === 'string' ? DURATIONS[i] : DURATIONS[i].value);
  }
  for (let i = 0; i < studentDurations.length; i++) {
    if (!options.includes(studentDurations[i])) {
      options.push(studentDurations[i]);
    }
  }

  return (
    <div className={'mt-3 rounded-lg bg-white px-3 py-2.5 ring-1 ' + (selected ? 'ring-amber-200' : 'ring-accent-300')}>
      <p className="text-[13px] font-semibold text-slate-900">Duration of the internship</p>
      <p className="mt-0.5 text-xs leading-snug text-slate-500">
        The student chose {studentDurations.join(', ')}. Changed? Pick the new duration. The email shows only this one.
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Duration of the internship">
        {options.map(function (duration) {
          const isPicked = selected === duration;
          const studentChose = studentDurations.includes(duration);
          return (
            <button
              key={duration}
              type="button"
              role="radio"
              aria-checked={isPicked}
              disabled={disabled}
              onClick={function () {
                onChange(duration);
              }}
              className={
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition ' +
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-50 ' +
                (isPicked
                  ? 'border-brand-700 bg-brand-700 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50')
              }
            >
              {duration}
              {studentChose && (
                <span className={'text-[11px] font-medium ' + (isPicked ? 'text-white/80' : 'text-slate-400')}>(chosen)</span>
              )}
            </button>
          );
        })}
      </div>
      {!selected && <p className="mt-2 text-xs font-medium text-accent-600">Please pick the duration.</p>}
    </div>
  );
}

export default DurationChoice;
