import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import PasswordInput from '../components/PasswordInput';
import { resetPassword, clearToken } from '../adminApi';

const MIN_LENGTH = 10;

// Opened from the link in the "Reset your password" email: /admin/reset-password?token=...
function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (newPassword.length < MIN_LENGTH) {
      nextErrors.newPassword = 'New password must be at least ' + MIN_LENGTH + ' characters long.';
    }
    if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = 'The two passwords do not match.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSaving(true);
    try {
      const message = await resetPassword(token, newPassword);
      // Any old sign-in on this browser no longer works, so start fresh
      clearToken();
      navigate('/admin/login', { replace: true, state: { message: message } });
    } catch (error) {
      if (error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
        setErrors(error.fieldErrors);
      } else {
        setErrors({ form: error.message });
      }
      setIsSaving(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Reset password">
        <div className="mt-8 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-700">This reset link is incomplete. Please open the link from the email again, or ask for a new one.</p>
          <Link to="/admin/forgot-password" className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline">
            Get a new reset link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="After this, every device will need to sign in again.">
      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-7">
        <PasswordInput
          id="new-password"
          label="New password"
          autoComplete="new-password"
          hint={'At least ' + MIN_LENGTH + ' characters. Mix letters, numbers and a symbol.'}
          value={newPassword}
          error={errors.newPassword}
          onChange={function (value) {
            setNewPassword(value);
            setErrors({});
          }}
        />
        <PasswordInput
          id="confirm-password"
          label="Type the new password again"
          autoComplete="new-password"
          value={confirmPassword}
          error={errors.confirmPassword}
          onChange={function (value) {
            setConfirmPassword(value);
            setErrors({});
          }}
        />

        {errors.form && (
          <div role="alert" className="rounded-lg bg-accent-50 px-3.5 py-2.5 text-sm font-medium text-accent-600 ring-1 ring-accent-100">
            {errors.form}{' '}
            <Link to="/admin/forgot-password" className="underline">
              Get a new link
            </Link>
          </div>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full rounded-lg bg-brand-700 px-4 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/30 disabled:cursor-wait disabled:opacity-80"
        >
          {isSaving ? 'Saving…' : 'Save new password'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm">
        <Link to="/admin/login" className="font-semibold text-brand-700 hover:underline">
          ← Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default ResetPasswordPage;
