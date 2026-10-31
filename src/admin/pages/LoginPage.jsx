import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../../components/layout/Logo';
import { inputClass, getInputStateClass } from '../../components/ui/Field';
import { login, getToken } from '../adminApi';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Where to go after sign in (the page they tried to open, or the list)
  let goTo = '/admin';
  if (location.state && location.state.from) {
    goTo = location.state.from;
  }

  // Already signed in
  if (getToken()) {
    return <Navigate to={goTo} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await login(email.trim(), password);
      navigate(goTo, { replace: true });
    } catch (loginError) {
      setError(loginError.message);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="h-1.5 bg-brand-700" />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center">
            <Logo className="h-14 w-auto" />
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-brand-800">Admin sign in</h1>
            <p className="mt-1 text-sm text-slate-500">Maxgen Technologies internship applications</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-7">
            <div>
              <label htmlFor="admin-email" className="mb-1.5 block text-sm font-semibold text-slate-800">
                Email
              </label>
              <input
                id="admin-email"
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
                className={inputClass + ' ' + getInputStateClass(false)}
                placeholder="you@maxgentechnologies.com"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="mb-1.5 block text-sm font-semibold text-slate-800">
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={function (event) {
                    setPassword(event.target.value);
                    setError('');
                  }}
                  className={inputClass + ' pr-16 ' + getInputStateClass(false)}
                />
                <button
                  type="button"
                  onClick={function () {
                    setShowPassword(!showPassword);
                  }}
                  className="absolute inset-y-0 right-0 px-3.5 text-xs font-semibold text-brand-700 focus:outline-none focus-visible:underline"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-accent-50 px-3.5 py-2.5 text-sm font-medium text-accent-600 ring-1 ring-accent-100">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-brand-700 px-4 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/30 disabled:cursor-wait disabled:opacity-80"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
            Forgot your password? Ask the person who manages the server to reset it with{' '}
            <code className="rounded bg-slate-200/70 px-1 py-0.5 text-[11px] text-slate-700">npm run create-admin</code>.
          </p>
        </div>
      </main>
    </div>
  );
}

export default LoginPage;
