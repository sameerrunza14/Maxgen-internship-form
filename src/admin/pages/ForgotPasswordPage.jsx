import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { inputClass, getInputStateClass, FieldError } from '../../components/ui/Field';
import { forgotPassword } from '../adminApi';

function ForgotPasswordPage() {
  const location = useLocation();
  // The change-password page sends the signed-in admin's email here
  const startEmail = location.state && location.state.email ? location.state.email : '';

  const [email, setEmail] = useState(startEmail);
  const [error, setError] = useState('');
  const [sentMessage, setSentMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || cleanEmail.indexOf('@') === -1) {
      setError('Please enter the email you use to sign in.');
      return;
    }
    setIsSending(true);
    setError('');
    try {
      const message = await forgotPassword(cleanEmail);
      setSentMessage(message);
    } catch (sendError) {
      setError(sendError.fieldErrors && sendError.fieldErrors.email ? sendError.fieldErrors.email : sendError.message);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <AuthLayout title="Forgot password" subtitle="We will email you a link to choose a new password.">
      {sentMessage ? (
        <div className="mt-8 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200 sm:p-7">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M3 4a2 2 0 00-2 2v.4l9 4.8 9-4.8V6a2 2 0 00-2-2H3z" />
              <path d="M19 8.6l-9 4.8-9-4.8V14a2 2 0 002 2h14a2 2 0 002-2V8.6z" />
            </svg>
          </div>
          <p role="status" className="mt-4 text-sm leading-relaxed text-slate-700">
            {sentMessage}
          </p>
          <p className="mt-2 text-[13px] text-slate-500">The link works for 30 minutes.</p>
          <button
            type="button"
            onClick={function () {
              setSentMessage('');
            }}
            className="mt-5 text-sm font-semibold text-brand-700 hover:underline"
          >
            Didn&apos;t get it? Send again
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-7">
          <div>
            <label htmlFor="reset-email" className="mb-1.5 block text-sm font-semibold text-slate-800">
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={function (event) {
                setEmail(event.target.value);
                setError('');
              }}
              aria-invalid={error ? 'true' : 'false'}
              className={inputClass + ' ' + getInputStateClass(error)}
              placeholder="you@maxgentechnologies.com"
            />
            <FieldError message={error} />
          </div>

          <button
            type="submit"
            disabled={isSending}
            className="w-full rounded-lg bg-brand-700 px-4 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/30 disabled:cursor-wait disabled:opacity-80"
          >
            {isSending ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm">
        <Link to="/admin/login" className="font-semibold text-brand-700 hover:underline">
          ← Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
