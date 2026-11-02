import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SessionExpiredError } from '../adminApi';
import { useAdmin } from '../AdminAuth';
import AdminLayout from './AdminLayout';

// Small building blocks shared by the admin pages

export const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition ' +
  'hover:bg-brand-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/30 disabled:cursor-not-allowed disabled:opacity-60';

export const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ' +
  'transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

export const dangerButton =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-accent-500 bg-white px-4 py-2.5 text-sm font-semibold text-accent-600 ' +
  'transition hover:bg-accent-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/20 disabled:cursor-not-allowed disabled:opacity-50';

export const inputClass =
  'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 ' +
  'focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15 sm:text-sm';

// Page heading with optional buttons on the right
export function PageTitle({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

// type: 'error' | 'success' | 'warning' | 'info'
const ALERT_STYLES = {
  error: 'border-accent-100 bg-accent-50 text-accent-600',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-brand-100 bg-brand-50 text-brand-800',
};

export function Alert({ type, children, className }) {
  if (!children) {
    return null;
  }
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={'rounded-lg border px-4 py-3 text-sm ' + (ALERT_STYLES[type] || ALERT_STYLES.info) + ' ' + (className || '')}
    >
      {children}
    </div>
  );
}

export function Card({ title, children, actions }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 sm:px-5">
          <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
          {actions}
        </div>
      )}
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

/**
 * "Are you sure?" box in the middle of the screen.
 *   typeToConfirm: the user must type this word (for things that cannot be undone, e.g. "DELETE")
 */
export function ConfirmDialog({ title, message, confirmLabel, danger, busy, typeToConfirm, onConfirm, onCancel }) {
  const [typed, setTyped] = useState('');
  const cancelRef = useRef(null);

  useEffect(function () {
    if (cancelRef.current) {
      cancelRef.current.focus();
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        onCancel();
      }
    }
    window.addEventListener('keydown', closeOnEscape);
    return function () {
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onCancel]);

  const canConfirm = !busy && (!typeToConfirm || typed.trim().toUpperCase() === typeToConfirm);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h2 id="confirm-title" className="text-lg font-bold text-slate-900">
          {title}
        </h2>
        <div className="mt-2 text-sm leading-relaxed text-slate-600">{message}</div>
        {typeToConfirm && (
          <label className="mt-4 block">
            <span className="mb-1 block text-[13px] font-semibold text-slate-700">
              Type <span className="font-mono text-accent-600">{typeToConfirm}</span> to confirm
            </span>
            <input
              type="text"
              value={typed}
              autoComplete="off"
              onChange={function (event) {
                setTyped(event.target.value);
              }}
              className={inputClass}
            />
          </label>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" onClick={onCancel} disabled={busy} className={secondaryButton}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className={
              danger
                ? 'inline-flex items-center justify-center rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50'
                : primaryButton
            }
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Returns a function for errors from adminApi: an expired sign-in goes to the login page, anything else is shown
export function useErrorHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  return function (error, setMessage) {
    if (error instanceof SessionExpiredError) {
      navigate('/admin/login', { replace: true, state: { from: location.pathname + location.search } });
      return;
    }
    setMessage(error.message);
  };
}

// Wraps the superadmin-only pages
export function RequireSuperadmin({ children }) {
  const { isSuperadmin } = useAdmin();
  if (!isSuperadmin) {
    return (
      <AdminLayout>
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-base font-semibold text-slate-800">Only a superadmin can open this page</p>
          <p className="mt-1 text-sm text-slate-500">Ask your superadmin if you need access.</p>
        </div>
      </AdminLayout>
    );
  }
  return children;
}

// Bar for the Reports page: value out of max, as a percentage width
export function Bar({ value, max, className }) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={'h-full rounded-full ' + (className || 'bg-brand-600')} style={{ width: width + '%' }} />
    </div>
  );
}
