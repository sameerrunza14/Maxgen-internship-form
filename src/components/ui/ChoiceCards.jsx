import { Field } from './Field';

function CheckIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 111.4-1.4l2.8 2.79 6.8-6.8a1 1 0 011.4 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function getCardClass(isSelected, hasError, compact) {
  let classes =
    'relative flex h-full min-h-12 cursor-pointer select-none items-start gap-2.5 rounded-xl sm:gap-3 border bg-white text-left ' +
    'transition-all duration-150 has-[input:focus-visible]:ring-4 has-[input:focus-visible]:ring-brand-600/20 ';

  classes = classes + (compact ? 'px-3 py-3 sm:px-3.5 ' : 'p-4 ');

  if (isSelected) {
    classes = classes + 'border-brand-700 bg-brand-50 shadow-[0_0_0_1px_var(--color-brand-700)] ';
  } else if (hasError) {
    classes = classes + 'border-accent-500/60 hover:border-accent-500 ';
  } else {
    classes = classes + 'border-slate-200 hover:border-brand-300 hover:bg-slate-50 ';
  }
  return classes;
}

function getGridClass(gridClass) {
  if (!gridClass) {
    return 'grid grid-cols-1 gap-3 sm:grid-cols-2';
  }
  // Use the gap given in gridClass, otherwise the default gap
  if (gridClass.includes('gap-')) {
    return 'grid ' + gridClass;
  }
  return 'grid gap-3 ' + gridClass;
}

/**
 * A group of selectable cards.
 * multiple = false -> radio buttons (one value, a string)
 * multiple = true  -> checkboxes (many values, an array)
 */
export function ChoiceCards({
  label,
  name,
  options,
  value,
  multiple,
  required,
  hint,
  error,
  onChange,
  gridClass,
  compact,
  hideDescriptionOnMobile,
  centerOnMobile,
  className,
  maxSelected,
}) {
  // multiple + maxSelected: once the limit is reached, the other cards cannot be picked
  const limitReached = Boolean(multiple && maxSelected && value.length >= maxSelected);

  function isSelected(optionValue) {
    if (multiple) {
      return value.includes(optionValue);
    }
    return value === optionValue;
  }

  function handleChange(optionValue) {
    if (!multiple) {
      onChange(name, optionValue);
      return;
    }

    const newList = [];
    let wasSelected = false;
    for (let i = 0; i < value.length; i++) {
      if (value[i] === optionValue) {
        wasSelected = true;
      } else {
        newList.push(value[i]);
      }
    }
    if (!wasSelected) {
      newList.push(optionValue);
    }
    onChange(name, newList);
  }

  return (
    <Field as="group" label={label} required={required} hint={hint} error={error} className={className}>
      <div
        role={multiple ? 'group' : 'radiogroup'}
        aria-label={label}
        aria-invalid={error ? 'true' : 'false'}
        className={getGridClass(gridClass)}
      >
        {options.map(function (option) {
          const selected = isSelected(option.value);
          const isDisabled = limitReached && !selected;
          return (
            <label
              key={option.value}
              className={
                getCardClass(selected, Boolean(error), compact) +
                (centerOnMobile ? 'max-sm:justify-center max-sm:px-1.5 max-sm:text-center ' : '') +
                (isDisabled ? 'cursor-not-allowed opacity-45 hover:border-slate-200 hover:bg-white ' : '')
              }
            >
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={name}
                value={option.value}
                checked={selected}
                disabled={isDisabled}
                onChange={function () {
                  handleChange(option.value);
                }}
                className="sr-only"
              />
              <span
                className={
                  'mt-px flex h-5 w-5 shrink-0 items-center justify-center border transition-colors ' +
                  (centerOnMobile ? 'max-sm:hidden ' : '') +
                  (multiple ? 'rounded-md ' : 'rounded-full ') +
                  (selected ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300 bg-white text-transparent')
                }
              >
                {multiple ? <CheckIcon className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-current" />}
              </span>
              <span className="min-w-0">
                <span className={'block text-[14px] font-semibold leading-snug sm:text-[15px] ' + (selected ? 'text-brand-800' : 'text-slate-800')}>
                  {option.label}
                </span>
                {option.description && (
                  <span
                    className={
                      'mt-0.5 text-[13px] leading-snug text-slate-500 ' + (hideDescriptionOnMobile ? 'hidden sm:block' : 'block')
                    }
                  >
                    {option.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </Field>
  );
}
