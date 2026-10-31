import { useState } from 'react';
import { inputClass, getInputStateClass, FieldError } from '../../components/ui/Field';

// Password box with a Show / Hide button (used on the change-password and reset-password pages)
function PasswordInput({ id, label, value, error, autoComplete, onChange, hint }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-800">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={function (event) {
            onChange(event.target.value);
          }}
          aria-invalid={error ? 'true' : 'false'}
          className={inputClass + ' pr-16 ' + getInputStateClass(error)}
        />
        <button
          type="button"
          onClick={function () {
            setVisible(!visible);
          }}
          className="absolute inset-y-0 right-0 px-3.5 text-xs font-semibold text-brand-700 focus:outline-none focus-visible:underline"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {hint && !error && <p className="mt-1.5 text-[13px] text-slate-500">{hint}</p>}
      <FieldError message={error} />
    </div>
  );
}

export default PasswordInput;
