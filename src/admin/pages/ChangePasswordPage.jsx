import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import PasswordInput from '../components/PasswordInput';
import { useAdmin } from '../AdminAuth';
import { changePassword, SessionExpiredError } from '../adminApi';

const MIN_LENGTH = 10;

function ChangePasswordPage() {
  const navigate = useNavigate();
  const { admin } = useAdmin();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');

    // Check in the browser first
    const nextErrors = {};
    if (!currentPassword) {
      nextErrors.currentPassword = 'Please enter your current password.';
    }
    if (newPassword.length < MIN_LENGTH) {
      nextErrors.newPassword = 'New password must be at least ' + MIN_LENGTH + ' characters long.';
    } else if (newPassword === currentPassword) {
      nextErrors.newPassword = 'New password must be different from the current one.';
    }
    if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = 'The two new passwords do not match.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Password changed. Other devices signed in with the old password have been signed out.');
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        navigate('/admin/login', { replace: true, state: { from: '/admin/password' } });
        return;
      }
      if (error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
        setErrors(error.fieldErrors);
      } else {
        setErrors({ form: error.message });
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminLayout>
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
        ← All applications
      </Link>

      <div className="mx-auto mt-6 max-w-md">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Change password</h1>
        <p className="mt-1 text-sm text-slate-500">After the change, every other device will need to sign in again.</p>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <PasswordInput
            id="current-password"
            label="Current password"
            autoComplete="current-password"
            value={currentPassword}
            error={errors.currentPassword}
            onChange={function (value) {
              setCurrentPassword(value);
              setErrors({});
            }}
          />
          <p className="-mt-2 text-[13px] text-slate-500">
            Don&apos;t remember it?{' '}
            <Link
              to="/admin/forgot-password"
              state={{ email: admin ? admin.email : '' }}
              className="font-semibold text-brand-700 hover:underline"
            >
              Reset it by email
            </Link>
          </p>
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
            <p role="alert" className="rounded-lg bg-accent-50 px-3.5 py-2.5 text-sm font-medium text-accent-600 ring-1 ring-accent-100">
              {errors.form}
            </p>
          )}
          {message && (
            <p role="status" className="rounded-lg bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-lg bg-brand-700 px-4 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/30 disabled:cursor-wait disabled:opacity-80"
          >
            {isSaving ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}

export default ChangePasswordPage;
