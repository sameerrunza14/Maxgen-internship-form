import { useState } from 'react';

const MAX_TECHNOLOGIES = 3;
const TYPE_OWN = '__type_own__';

/**
 * Shown in the "Accept?" and "Mark as joined?" boxes.
 * HR ticks the technology the student will really learn. Only the ticked ones are saved and shown in the email.
 *
 * studentTechnologies: what the student chose on the form
 * allTechnologies:     every technology on the form (Settings), for "Other technology"
 * selected / onChange: the ticked list
 */
function TechnologyChoice({ studentTechnologies, allTechnologies, selected, onChange, disabled }) {
  const [showOther, setShowOther] = useState(false);
  const [otherValue, setOtherValue] = useState(''); // value of the "Other technology" dropdown
  const [typedName, setTypedName] = useState(''); // name typed when the course is not in the list
  const [otherError, setOtherError] = useState('');

  // Chips: the student's choices, then any other technology HR added
  const chips = studentTechnologies.slice();
  for (let i = 0; i < selected.length; i++) {
    if (!chips.includes(selected[i])) {
      chips.push(selected[i]);
    }
  }

  // Technologies for the "Other technology" dropdown (not already shown as a chip)
  const otherOptions = [];
  for (let i = 0; i < allTechnologies.length; i++) {
    if (!chips.includes(allTechnologies[i])) {
      otherOptions.push(allTechnologies[i]);
    }
  }

  const isFull = selected.length >= MAX_TECHNOLOGIES;

  function toggle(technology) {
    if (selected.includes(technology)) {
      const next = [];
      for (let i = 0; i < selected.length; i++) {
        if (selected[i] !== technology) {
          next.push(selected[i]);
        }
      }
      onChange(next);
      return;
    }
    if (isFull) {
      return;
    }
    onChange(selected.concat([technology]));
  }

  // Adds the technology from "Other technology" and unticks the student's own choices
  // (a student joining a different course usually does not learn the ones they ticked on the form)
  function addOther() {
    let name = otherValue;
    if (otherValue === TYPE_OWN) {
      name = typedName.replace(/\s+/g, ' ').trim();
      if (name.length < 2) {
        setOtherError('Please type the technology name.');
        return;
      }
      if (!/^[A-Za-z0-9 .+#&()/-]+$/.test(name) || name.length > 60) {
        setOtherError('Use letters and numbers only (no commas), up to 60 characters.');
        return;
      }
      // Typed a name that is already in the list? Use the list spelling.
      for (let i = 0; i < allTechnologies.length; i++) {
        if (allTechnologies[i].toLowerCase() === name.toLowerCase()) {
          name = allTechnologies[i];
        }
      }
    }
    if (!name) {
      setOtherError('Please choose a technology.');
      return;
    }

    const next = [];
    for (let i = 0; i < selected.length; i++) {
      if (!studentTechnologies.includes(selected[i]) && selected[i] !== name) {
        next.push(selected[i]); // keep other technologies HR already added
      }
    }
    if (next.length >= MAX_TECHNOLOGIES) {
      setOtherError('At most ' + MAX_TECHNOLOGIES + ' technologies.');
      return;
    }
    next.push(name);
    onChange(next);
    setShowOther(false);
    setOtherValue('');
    setTypedName('');
    setOtherError('');
  }

  const studentChoseMany = studentTechnologies.length > 1;

  return (
    <div
      className={
        'mt-3 rounded-lg bg-white px-3 py-2.5 ring-1 ' + (selected.length === 0 ? 'ring-accent-300' : 'ring-amber-200')
      }
    >
      <p className="text-[13px] font-semibold text-slate-900">Which technology is confirmed?</p>
      <p className="mt-0.5 text-xs leading-snug text-slate-500">
        {studentChoseMany
          ? 'The student chose ' + studentTechnologies.length + '. Tick only what they will learn. '
          : 'Joining a different one (e.g. Full Stack)? Use "+ Other technology". '}
        The email shows only the ticked ones.
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {chips.map(function (technology) {
          const isTicked = selected.includes(technology);
          const isOther = !studentTechnologies.includes(technology);
          return (
            <button
              key={technology}
              type="button"
              disabled={disabled || (!isTicked && isFull)}
              aria-pressed={isTicked}
              onClick={function () {
                toggle(technology);
              }}
              title={isOther ? 'Not chosen by the student on the form' : undefined}
              className={
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition ' +
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-50 ' +
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
              {isOther && <span className={'text-[11px] font-medium ' + (isTicked ? 'text-white/80' : 'text-slate-400')}>(other)</span>}
            </button>
          );
        })}

        {!showOther && (
          <button
            type="button"
            disabled={disabled}
            onClick={function () {
              setShowOther(true);
              setOtherError('');
            }}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-brand-300 px-3 py-1.5 text-[13px] font-semibold text-brand-700 hover:border-brand-600 hover:bg-brand-50 disabled:opacity-50"
          >
            + Other technology
          </button>
        )}
      </div>

      {showOther && (
        <div className="mt-2.5 rounded-lg bg-slate-50 p-2.5 ring-1 ring-slate-200">
          <label className="block text-xs font-semibold text-slate-700" htmlFor="other-technology">
            Joining a different technology
          </label>
          <select
            id="other-technology"
            value={otherValue}
            disabled={disabled}
            onChange={function (event) {
              setOtherValue(event.target.value);
              setOtherError('');
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
          >
            <option value="">Choose a technology…</option>
            {otherOptions.map(function (technology) {
              return (
                <option key={technology} value={technology}>
                  {technology}
                </option>
              );
            })}
            <option value={TYPE_OWN}>Not in the list: type the name…</option>
          </select>
          {otherValue === TYPE_OWN && (
            <input
              type="text"
              value={typedName}
              maxLength={60}
              disabled={disabled}
              placeholder="e.g. Angular"
              onChange={function (event) {
                setTypedName(event.target.value);
                setOtherError('');
              }}
              onKeyDown={function (event) {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addOther();
                }
              }}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
            />
          )}
          <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
            The student's own choices are unticked. Tick one again if they will learn it too.
          </p>
          {otherError && <p className="mt-1 text-xs font-medium text-accent-600">{otherError}</p>}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={addOther}
              className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
            >
              Use this technology
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={function () {
                setShowOther(false);
                setOtherValue('');
                setTypedName('');
                setOtherError('');
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {selected.length === 0 && <p className="mt-2 text-xs font-medium text-accent-600">Please tick at least one technology.</p>}
      {isFull && <p className="mt-2 text-[11px] text-slate-500">At most {MAX_TECHNOLOGIES} technologies.</p>}
    </div>
  );
}

export default TechnologyChoice;
