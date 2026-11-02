import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { Alert, Card, ConfirmDialog, PageTitle, inputClass, primaryButton, secondaryButton, useErrorHandler } from '../components/AdminUi';
import { useAdmin } from '../AdminAuth';
import { listUsers, createUser, updateUser, sendSetupLink } from '../adminApi';
import { formatDateTime } from '../formatters';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin (HR)', help: 'Applications, accept / reject, notes, documents, Excel' },
  { value: 'superadmin', label: 'Superadmin', help: 'Everything, plus users, settings, reports, activity log and trash' },
];

function roleLabel(role) {
  return role === 'superadmin' ? 'Superadmin' : 'Admin (HR)';
}

// The set-password link, shown once after adding a user, with a Copy button
function SetupLinkBox({ link, onClose }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-brand-100 bg-brand-50 p-3">
      <p className="text-[13px] font-semibold text-brand-800">Set-password link (works for 48 hours, only once)</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input readOnly value={link} onFocus={function (event) { event.target.select(); }} className={inputClass + ' min-w-0 font-mono text-xs sm:flex-1 sm:text-xs'} />
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={copyLink} className={primaryButton + ' shrink-0'}>
            {copied ? 'Copied ✓' : 'Copy link'}
          </button>
          <button type="button" onClick={onClose} className={secondaryButton + ' shrink-0'}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function UsersPage() {
  const { admin } = useAdmin();
  const handleError = useErrorHandler();
  const [users, setUsers] = useState(null);
  const [pageError, setPageError] = useState('');
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [setupLink, setSetupLink] = useState('');

  // Add user form
  const [form, setForm] = useState({ name: '', email: '', role: 'admin' });
  const [formErrors, setFormErrors] = useState({});
  const [isAdding, setIsAdding] = useState(false);

  // "Are you sure?" for role / on-off changes: { user, changes, title, message }
  const [confirm, setConfirm] = useState(null);
  const [busyId, setBusyId] = useState(null);

  function loadUsers() {
    listUsers()
      .then(function (data) {
        setUsers(data.users);
      })
      .catch(function (error) {
        handleError(error, setPageError);
      });
  }

  useEffect(loadUsers, []); // eslint-disable-line react-hooks/exhaustive-deps

  function updateForm(name, value) {
    setForm({ ...form, [name]: value });
    setFormErrors({ ...formErrors, [name]: '' });
  }

  async function handleAdd(event) {
    event.preventDefault();
    setIsAdding(true);
    setFormErrors({});
    setNotice({ type: '', text: '' });
    setSetupLink('');
    try {
      const result = await createUser(form.name.trim(), form.email.trim(), form.role);
      setNotice({ type: result.emailSent ? 'success' : 'warning', text: result.message });
      setSetupLink(result.setupLink);
      setForm({ name: '', email: '', role: 'admin' });
      loadUsers();
    } catch (error) {
      if (error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
        setFormErrors(error.fieldErrors);
      } else {
        handleError(error, function (message) {
          setNotice({ type: 'error', text: message });
        });
      }
    } finally {
      setIsAdding(false);
    }
  }

  async function saveChange() {
    const { user, changes } = confirm;
    setBusyId(user.id);
    setNotice({ type: '', text: '' });
    try {
      const result = await updateUser(user.id, changes);
      setNotice({ type: 'success', text: user.name + ': ' + result.message });
      setConfirm(null);
      loadUsers();
    } catch (error) {
      setConfirm(null);
      handleError(error, function (message) {
        setNotice({ type: 'error', text: message });
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleNewLink(user) {
    setBusyId(user.id);
    setNotice({ type: '', text: '' });
    setSetupLink('');
    try {
      const result = await sendSetupLink(user.id);
      setNotice({ type: result.emailSent ? 'success' : 'warning', text: result.message });
      setSetupLink(result.setupLink);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      handleError(error, function (message) {
        setNotice({ type: 'error', text: message });
      });
    } finally {
      setBusyId(null);
    }
  }

  function askRoleChange(user) {
    const newRole = user.role === 'superadmin' ? 'admin' : 'superadmin';
    setConfirm({
      user: user,
      changes: { role: newRole },
      title: newRole === 'superadmin' ? 'Make ' + user.name + ' a superadmin?' : 'Change ' + user.name + ' to Admin (HR)?',
      message:
        newRole === 'superadmin'
          ? 'They will be able to add and remove users, change settings and delete applications.'
          : 'They will only see applications. Users, settings, reports, activity log and trash will be hidden.',
      confirmLabel: 'Yes, change role',
      danger: false,
    });
  }

  function askActiveChange(user) {
    const turnOn = !user.isActive;
    setConfirm({
      user: user,
      changes: { isActive: turnOn },
      title: turnOn ? 'Turn on ' + user.name + "'s account?" : 'Turn off ' + user.name + "'s account?",
      message: turnOn
        ? 'They can sign in again with their old password (or use "Send set-password link").'
        : 'They are signed out at once and cannot sign in. Their notes and history stay. You can turn the account on again later.',
      confirmLabel: turnOn ? 'Yes, turn on' : 'Yes, turn off',
      danger: !turnOn,
    });
  }

  const superadminCount = users
    ? users.filter(function (user) {
        return user.role === 'superadmin' && user.isActive;
      }).length
    : 0;

  return (
    <AdminLayout>
      <PageTitle title="Users" subtitle="People who can sign in to this admin panel. Each person has their own account." />

      <Alert type="error" className="mt-5">{pageError}</Alert>
      {notice.text && (
        <div className="mt-5">
          <Alert type={notice.type}>{notice.text}</Alert>
          {setupLink && (
            <SetupLinkBox
              link={setupLink}
              onClose={function () {
                setSetupLink('');
              }}
            />
          )}
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* ---------- List ---------- */}
        <Card title={users ? 'All users (' + users.length + ')' : 'All users'}>
          {!users && !pageError && <p className="py-6 text-center text-sm text-slate-500">Loading…</p>}
          {users && (
            <ul className="divide-y divide-slate-100">
              {users.map(function (user) {
                const isMe = user.id === admin.id;
                const isLastSuperadmin = user.role === 'superadmin' && user.isActive && superadminCount <= 1;
                return (
                  <li key={user.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-slate-900">
                          {user.name}
                          {isMe && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">You</span>}
                          <span
                            className={
                              'rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ' +
                              (user.role === 'superadmin' ? 'bg-brand-50 text-brand-800 ring-brand-100' : 'bg-white text-slate-600 ring-slate-200')
                            }
                          >
                            {roleLabel(user.role)}
                          </span>
                          {!user.isActive && (
                            <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-semibold text-accent-600 ring-1 ring-accent-100">
                              Turned off
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 break-all text-[13px] text-slate-500">{user.email}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {user.lastLoginAt ? 'Last sign-in ' + formatDateTime(user.lastLoginAt) : 'Never signed in'}
                        </p>
                      </div>
                      {!isMe && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busyId !== null || isLastSuperadmin}
                            title={isLastSuperadmin ? 'There must always be at least one superadmin' : ''}
                            onClick={function () {
                              askRoleChange(user);
                            }}
                            className={secondaryButton + ' !px-3 !py-2 text-[13px]'}
                          >
                            {user.role === 'superadmin' ? 'Make Admin (HR)' : 'Make superadmin'}
                          </button>
                          {user.isActive && (
                            <button
                              type="button"
                              disabled={busyId !== null}
                              onClick={function () {
                                handleNewLink(user);
                              }}
                              className={secondaryButton + ' !px-3 !py-2 text-[13px]'}
                            >
                              {busyId === user.id && !confirm ? 'Sending…' : 'Send set-password link'}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyId !== null || isLastSuperadmin}
                            onClick={function () {
                              askActiveChange(user);
                            }}
                            className={
                              (user.isActive ? secondaryButton + ' hover:!border-accent-500 hover:!text-accent-600' : secondaryButton) +
                              ' !px-3 !py-2 text-[13px]'
                            }
                          >
                            {user.isActive ? 'Turn off' : 'Turn on'}
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* ---------- Add user ---------- */}
        <Card title="Add a user">
          <form onSubmit={handleAdd} noValidate className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-slate-700">Full name</span>
              <input
                type="text"
                value={form.name}
                maxLength={100}
                onChange={function (event) {
                  updateForm('name', event.target.value);
                }}
                className={inputClass}
                placeholder="e.g. Hema Shah"
              />
              {formErrors.name && <span className="mt-1 block text-[13px] font-medium text-accent-600">{formErrors.name}</span>}
            </label>
            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-slate-700">Email (used to sign in)</span>
              <input
                type="email"
                value={form.email}
                maxLength={190}
                onChange={function (event) {
                  updateForm('email', event.target.value);
                }}
                className={inputClass}
                placeholder="name@maxgentechnologies.com"
              />
              {formErrors.email && <span className="mt-1 block text-[13px] font-medium text-accent-600">{formErrors.email}</span>}
            </label>
            <fieldset>
              <legend className="mb-1 block text-[13px] font-semibold text-slate-700">Role</legend>
              <div className="space-y-2">
                {ROLE_OPTIONS.map(function (option) {
                  const isChosen = form.role === option.value;
                  return (
                    <label
                      key={option.value}
                      className={
                        'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition ' +
                        (isChosen ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:border-slate-300')
                      }
                    >
                      <input
                        type="radio"
                        name="role"
                        value={option.value}
                        checked={isChosen}
                        onChange={function () {
                          updateForm('role', option.value);
                        }}
                        className="mt-0.5 h-4 w-4 accent-brand-700"
                      />
                      <span className="text-sm leading-snug">
                        <span className="block font-semibold text-slate-900">{option.label}</span>
                        <span className="block text-[13px] text-slate-500">{option.help}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {formErrors.role && <span className="mt-1 block text-[13px] font-medium text-accent-600">{formErrors.role}</span>}
            </fieldset>
            <button type="submit" disabled={isAdding} className={primaryButton + ' w-full'}>
              {isAdding ? 'Adding…' : 'Add user'}
            </button>
            <p className="text-xs leading-relaxed text-slate-500">
              No password is needed here. They get an email with a link to choose their own password. You will also see
              the link here, to share on WhatsApp if the email does not arrive.
            </p>
          </form>
        </Card>
      </div>

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          busy={busyId !== null}
          onConfirm={saveChange}
          onCancel={function () {
            setConfirm(null);
          }}
        />
      )}
    </AdminLayout>
  );
}

export default UsersPage;
