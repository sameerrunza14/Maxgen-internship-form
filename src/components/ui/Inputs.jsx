import { Field, inputClass, getInputStateClass } from './Field';

export function TextInput({ label, name, value, error, required, optional, hint, onChange, onBlur, className, ...rest }) {
  return (
    <Field label={label} htmlFor={name} required={required} optional={optional} hint={hint} error={error} className={className}>
      <input
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? name + '-error' : undefined}
        className={inputClass + ' ' + getInputStateClass(error)}
        {...rest}
      />
    </Field>
  );
}

// Indian mobile number with a fixed +91 prefix. Only digits can be typed.
export function PhoneInput({ label, name, value, error, required, hint, onChange, onBlur, className }) {
  function handleChange(event) {
    let digits = '';
    const typed = event.target.value;
    for (let i = 0; i < typed.length; i++) {
      if (typed[i] >= '0' && typed[i] <= '9') {
        digits = digits + typed[i];
      }
    }
    onChange({ target: { name: name, value: digits.slice(0, 10) } });
  }

  return (
    <Field label={label} htmlFor={name} required={required} hint={hint} error={error} className={className}>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center gap-1.5 border-r border-slate-200 pl-3.5 pr-3 text-base font-medium sm:text-[15px] text-slate-500">
          +91
        </span>
        <input
          id={name}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={10}
          placeholder="98765 43210"
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? name + '-error' : undefined}
          className={inputClass + ' pl-16 tracking-wide ' + getInputStateClass(error)}
        />
      </div>
    </Field>
  );
}

export function SelectInput({ label, name, value, options, placeholder, error, required, hint, onChange, onBlur, className }) {
  return (
    <Field label={label} htmlFor={name} required={required} hint={hint} error={error} className={className}>
      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? name + '-error' : undefined}
          className={
            inputClass +
            ' cursor-pointer appearance-none pr-10 ' +
            (value === '' ? 'text-slate-400 ' : '') +
            getInputStateClass(error)
          }
        >
          <option value="">{placeholder}</option>
          {options.map(function (option) {
            const optionValue = typeof option === 'string' ? option : option.value;
            const optionLabel = typeof option === 'string' ? option : option.label;
            return (
              <option key={optionValue} value={optionValue} className="text-slate-900">
                {optionLabel}
              </option>
            );
          })}
        </select>
        <svg
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </Field>
  );
}

export function TextArea({ label, name, value, error, required, hint, maxLength, onChange, onBlur, className, ...rest }) {
  return (
    <Field label={label} htmlFor={name} required={required} hint={hint} error={error} className={className}>
      <textarea
        id={name}
        name={name}
        value={value}
        maxLength={maxLength}
        onChange={onChange}
        onBlur={onBlur}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? name + '-error' : undefined}
        className={inputClass + ' resize-y ' + getInputStateClass(error)}
        {...rest}
      />
      {maxLength && (
        <p className="mt-1 text-right text-xs text-slate-400">
          {value.length}/{maxLength}
        </p>
      )}
    </Field>
  );
}
