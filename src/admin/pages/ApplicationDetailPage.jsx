import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import StatusBadge from '../components/StatusBadge';
import EducationBadge from '../components/EducationBadge';
import { ReturningTag, VisitedTag, JoinedTag, ordinal } from '../components/Tags';
import CertificatesSection from '../components/CertificatesSection';
import NotesSection from '../components/NotesSection';
import FeesSection from '../components/FeesSection';
import { ConfirmDialog, secondaryButton } from '../components/AdminUi';
import { useAdmin } from '../AdminAuth';
import {
  getApplication,
  updateStatus,
  openDocument,
  updateVisited,
  updateJoined,
  moveToTrash,
  restoreApplication,
  SessionExpiredError,
} from '../adminApi';
import { formatDate, formatDateTime, formatPhone, formatFileSize } from '../formatters';
import { toDateText } from '../dateRanges';
import { DOCUMENTS } from '../../constants/formOptions';

function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <h2 className="border-b border-slate-200 px-4 py-3 text-[15px] font-bold text-slate-900 sm:px-5">{title}</h2>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

function Detail({ label, value, wide }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-[13px] text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-[15px] font-medium text-slate-900">{value || '—'}</dd>
    </div>
  );
}

function ContactButton({ href, label, children }) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20"
    >
      {children}
      {label}
    </a>
  );
}

function ApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, isSuperadmin } = useAdmin();
  const [application, setApplication] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [savingStatus, setSavingStatus] = useState('');
  const [confirmStatus, setConfirmStatus] = useState(''); // 'accepted' or 'rejected' while asking "Are you sure?"
  const [sendStatusEmail, setSendStatusEmail] = useState(true); // the "Email the student" tick box
  // "Application details saved." comes from the edit page
  const [statusMessage, setStatusMessage] = useState({
    text: location.state && location.state.savedMessage ? location.state.savedMessage : '',
    isWarning: false,
  });
  const [confirmAction, setConfirmAction] = useState(''); // 'trash' or a note id to delete
  const [isBusy, setIsBusy] = useState(false);
  const [isSavingVisit, setIsSavingVisit] = useState(false);
  const [isSavingJoin, setIsSavingJoin] = useState(false);
  // "Mark as joined?" box: open while HR confirms, with the "send welcome email" tick box
  const [confirmJoin, setConfirmJoin] = useState(false);
  const [sendJoinEmail, setSendJoinEmail] = useState(true);
  const [joiningDate, setJoiningDate] = useState(''); // 'YYYY-MM-DD', starts with today

  // Ticking the box asks first (it accepts the application and emails the student). Unticking is direct.
  function handleJoinedTick(joined) {
    if (joined) {
      setSendJoinEmail(!application.joiningEmailAt); // already sent once? then not ticked
      setJoiningDate(toDateText(new Date()));
      setConfirmStatus('');
      setStatusMessage({ text: '', isWarning: false });
      setConfirmJoin(true);
      return;
    }
    handleJoined(false, false);
  }

  async function handleJoined(joined, sendEmail) {
    setIsSavingJoin(true);
    setActionError('');
    setStatusMessage({ text: '', isWarning: false });
    try {
      const result = await updateJoined(id, joined, sendEmail, joined ? joiningDate : '');
      setApplication(result.application);
      setConfirmJoin(false);
      if (joined) {
        const isWarning = result.emailResult === 'failed' || result.emailResult === 'off';
        setStatusMessage({ text: result.message, isWarning: isWarning });
      }
    } catch (error) {
      handleError(error, setActionError);
    } finally {
      setIsSavingJoin(false);
    }
  }

  async function handleVisited(visited) {
    setIsSavingVisit(true);
    setActionError('');
    try {
      const updated = await updateVisited(id, visited);
      setApplication(updated);
    } catch (error) {
      handleError(error, setActionError);
    } finally {
      setIsSavingVisit(false);
    }
  }
  const [openingDocument, setOpeningDocument] = useState('');
  // ---------- Superadmin: trash / restore / delete note ----------

  async function handleTrash() {
    setIsBusy(true);
    setActionError('');
    try {
      const message = await moveToTrash(id);
      navigate('/admin', { replace: true, state: { trashedMessage: application.fullName + ': ' + message } });
    } catch (error) {
      setConfirmAction('');
      handleError(error, setActionError);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRestore() {
    setIsBusy(true);
    setActionError('');
    try {
      const message = await restoreApplication(id);
      setApplication(await getApplication(id));
      setStatusMessage({ text: message, isWarning: false });
    } catch (error) {
      handleError(error, setActionError);
    } finally {
      setIsBusy(false);
    }
  }

  function handleError(error, setMessage) {
    if (error instanceof SessionExpiredError) {
      navigate('/admin/login', { replace: true, state: { from: '/admin/applications/' + id } });
      return;
    }
    setMessage(error.message);
  }

  useEffect(
    function () {
      let cancelled = false;
      getApplication(id)
        .then(function (result) {
          if (!cancelled) {
            setApplication(result);
          }
        })
        .catch(function (error) {
          if (!cancelled) {
            handleError(error, setLoadError);
          }
        });
      return function () {
        cancelled = true;
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id]
  );

  // Opens the "Are you sure?" box. The email box is ticked, unless this same email was already sent before.
  function askToConfirm(status) {
    const alreadyEmailed = application.lastStatusEmail && application.lastStatusEmail.status === status;
    setSendStatusEmail(!alreadyEmailed);
    setConfirmJoin(false);
    setStatusMessage({ text: '', isWarning: false });
    setConfirmStatus(status);
  }

  async function changeStatus(status, sendEmail) {
    setSavingStatus(status);
    setActionError('');
    setStatusMessage({ text: '', isWarning: false });
    try {
      const result = await updateStatus(id, status, sendEmail);
      setApplication(result.application);
      setConfirmStatus('');
      if (result.emailResult === 'sent') {
        setStatusMessage({ text: 'Email sent to ' + result.application.email + '.', isWarning: false });
      } else if (result.emailResult === 'failed' || result.emailResult === 'off') {
        setStatusMessage({ text: result.message, isWarning: true });
      }
    } catch (error) {
      handleError(error, setActionError);
    } finally {
      setSavingStatus('');
    }
  }

  async function handleDocument(documentConfig, download) {
    const saved = application.documents[documentConfig.name];
    setOpeningDocument(documentConfig.name + (download ? '-download' : '-view'));
    setActionError('');
    try {
      const extension = saved.fileName.slice(saved.fileName.lastIndexOf('.'));
      const cleanLabel = documentConfig.label.replace(/[^A-Za-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
      const fileName = application.referenceNo + ' - ' + cleanLabel + extension;
      await openDocument(id, documentConfig.name, fileName, download);
    } catch (error) {
      handleError(error, setActionError);
    } finally {
      setOpeningDocument('');
    }
  }

  if (loadError) {
    return (
      <AdminLayout>
        <Link to="/admin" className="text-sm font-semibold text-brand-700 hover:underline">
          ← All applications
        </Link>
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-base font-semibold text-slate-800">{loadError}</p>
          <p className="mt-1 text-sm text-slate-500">It may have been removed, or the link is wrong.</p>
        </div>
      </AdminLayout>
    );
  }

  if (!application) {
    return (
      <AdminLayout>
        <p className="py-16 text-center text-sm text-slate-500">Loading application…</p>
      </AdminLayout>
    );
  }

  const app = application;
  const whatsappLink = 'https://wa.me/91' + app.contactNumber;

  return (
    <AdminLayout>
      <button
        type="button"
        onClick={function () {
          // Go back to the list with the same filters; if this page was opened directly, open the list
          if (window.history.state && window.history.state.idx > 0 && !(location.state && location.state.savedMessage)) {
            navigate(-1);
          } else {
            navigate(app.deletedAt ? '/admin/trash' : '/admin');
          }
        }}
        className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
      >
        ← {app.deletedAt ? 'Trash' : 'All applications'}
      </button>

      {/* In the trash: only the superadmin can see this page */}
      {app.deletedAt && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-accent-100 bg-accent-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-accent-600">
            <span className="font-semibold">This application is in the trash.</span> Deleted {formatDateTime(app.deletedAt)}
            {app.deletedBy && ' by ' + app.deletedBy.name}. It is hidden from the applications list. Restore it to change it.
          </p>
          <button type="button" disabled={isBusy} onClick={handleRestore} className={secondaryButton + ' shrink-0'}>
            {isBusy ? 'Restoring…' : 'Restore'}
          </button>
        </div>
      )}

      {/* ---------- Header ---------- */}
      <div className="mt-4 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{app.fullName}</h1>
            <StatusBadge status={app.status} large />
            <EducationBadge status={app.educationStatus} large />
            {app.earlierCount > 0 && <ReturningTag earlierCount={app.earlierCount} />}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {app.referenceNo} · Applied {formatDateTime(app.createdAt)}
          </p>
          <p className="mt-3 text-[15px] font-semibold text-brand-800">
            {app.internshipType && app.internshipType + ' internship · '}
            {app.technologies.join(', ')} · {app.durations.join(', ')} · {app.location} ({app.mode})
          </p>
          {app.reviewedBy && app.status !== 'pending' && (
            <p className="mt-2 text-[13px] text-slate-500">
              Marked {app.status} by {app.reviewedBy.name} on {formatDateTime(app.reviewedAt)}
            </p>
          )}
          {app.lastStatusEmail && (
            <p className="mt-1 text-[13px] text-slate-500">
              ✉ &quot;{app.lastStatusEmail.status === 'accepted' ? 'Accepted' : 'Not selected'}&quot; email sent to the student on{' '}
              {formatDateTime(app.lastStatusEmail.sentAt)}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <ContactButton href={'tel:+91' + app.contactNumber} label="Call">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h1.15a1.5 1.5 0 011.46 1.14l.57 2.3a1.5 1.5 0 01-.43 1.45l-1.1 1.04a11.04 11.04 0 004.92 4.92l1.04-1.1a1.5 1.5 0 011.45-.43l2.3.57A1.5 1.5 0 0118 13.35v1.15A1.5 1.5 0 0116.5 16h-1C8.04 16 2 9.96 2 2.5v1z" clipRule="evenodd" /></svg>
            </ContactButton>
            <ContactButton href={whatsappLink} label="WhatsApp">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.3-.4.7-1.3a.4.4 0 000-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.8 11.9 11.9 0 004.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 001.8-1.3 2.3 2.3 0 00.2-1.3c-.1-.1-.3-.2-.5-.3z" /></svg>
            </ContactButton>
            <ContactButton href={'mailto:' + app.email} label="Email">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M3 4a2 2 0 00-2 2v.4l9 4.8 9-4.8V6a2 2 0 00-2-2H3z" /><path d="M19 8.6l-9 4.8-9-4.8V14a2 2 0 002 2h14a2 2 0 002-2V8.6z" /></svg>
            </ContactButton>
          </div>
          {!app.deletedAt && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <Link
                to={'/admin/applications/' + app.id + '/edit'}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M2.7 13.6l-.7 3.6a.7.7 0 00.8.8l3.6-.7L15.9 7.8 12.2 4.1 2.7 13.6zM17.7 5.9a1.3 1.3 0 000-1.8l-1.8-1.8a1.3 1.3 0 00-1.8 0l-1.2 1.2 3.6 3.6 1.2-1.2z" /></svg>
                Edit details
              </Link>
              {isSuperadmin && (
              <button
                type="button"
                onClick={function () {
                  setConfirmAction('trash');
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-accent-600 hover:bg-accent-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.44c-.8.08-1.58.17-2.37.29a.75.75 0 10.23 1.48l.15-.02.84 10.52A2.75 2.75 0 007.59 19h4.82a2.75 2.75 0 002.74-2.54L16 5.94l.15.02a.75.75 0 00.23-1.48A41 41 0 0014 4.19v-.44A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.67.03 2.5.08v-.33c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.33C8.33 4.03 9.16 4 10 4z" clipRule="evenodd" /></svg>
                Move to trash
              </button>
              )}
            </div>
          )}
        </div>

        {/* Accept / Reject */}
        <div className={'shrink-0 lg:w-72' + (app.deletedAt ? ' hidden' : '')}>
          {confirmJoin ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <p className="text-sm font-semibold text-slate-900">Mark {app.fullName.split(' ')[0]} as joined?</p>
              <p className="mt-1 text-[13px] text-slate-600">
                {app.status === 'accepted'
                  ? 'The student has joined the internship.'
                  : 'The application is marked as Accepted automatically. No need to Accept or Reject.'}
              </p>
              <label className="mt-3 block">
                <span className="mb-1 block text-[13px] font-semibold text-slate-900">Joining date</span>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={function (event) {
                    setJoiningDate(event.target.value);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                />
                <span className="mt-1 block text-xs text-slate-500">Shown in the joining confirmation email.</span>
              </label>
              <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg bg-white px-3 py-2.5 ring-1 ring-slate-200">
                <input
                  type="checkbox"
                  checked={sendJoinEmail}
                  onChange={function (event) {
                    setSendJoinEmail(event.target.checked);
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-700"
                />
                <span className="text-[13px] leading-snug text-slate-700">
                  <span className="font-semibold text-slate-900">Email the student</span>
                  <br />
                  Joining confirmation email: selection, joining date and joining instructions.
                  {app.joiningEmailAt && (
                    <span className="mt-1 block text-amber-700">This email was already sent on {formatDateTime(app.joiningEmailAt)}.</span>
                  )}
                </span>
              </label>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={isSavingJoin || !joiningDate}
                  onClick={function () {
                    handleJoined(true, sendJoinEmail);
                  }}
                  className="flex-1 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
                >
                  {isSavingJoin ? 'Saving…' : 'Yes, mark as joined'}
                </button>
                <button
                  type="button"
                  disabled={isSavingJoin}
                  onClick={function () {
                    setConfirmJoin(false);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : app.joinedAt ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 111.4-1.4l2.8 2.79 6.8-6.8a1 1 0 011.4 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Joined the internship
              </p>
              <p className="mt-1 text-[13px] text-emerald-900/80">
                {app.joiningDate && (
                  <span className="block font-semibold text-emerald-900">Joining date: {formatDate(app.joiningDate)}</span>
                )}
                Accepted. No need to Accept or Reject.
                {app.joiningEmailAt
                  ? ' Joining email sent on ' + formatDateTime(app.joiningEmailAt) + '.'
                  : ' No joining email sent.'}
              </p>
            </div>
          ) : confirmStatus ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                {confirmStatus === 'accepted' ? 'Accept this application?' : 'Reject this application?'}
              </p>
              <p className="mt-1 text-[13px] text-slate-500">You can change the status later, but an email cannot be taken back.</p>
              <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg bg-white px-3 py-2.5 ring-1 ring-slate-200">
                <input
                  type="checkbox"
                  checked={sendStatusEmail}
                  onChange={function (event) {
                    setSendStatusEmail(event.target.checked);
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-700"
                />
                <span className="text-[13px] leading-snug text-slate-700">
                  <span className="font-semibold text-slate-900">Email the student</span>
                  <br />
                  {confirmStatus === 'accepted'
                    ? 'Congratulations email with the next steps.'
                    : 'Polite "not selected this time" email.'}
                  {app.lastStatusEmail && app.lastStatusEmail.status === confirmStatus && (
                    <span className="mt-1 block text-amber-700">This email was already sent once.</span>
                  )}
                </span>
              </label>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={savingStatus !== ''}
                  onClick={function () {
                    changeStatus(confirmStatus, sendStatusEmail);
                  }}
                  className={
                    'flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-70 ' +
                    (confirmStatus === 'accepted' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-accent-500 hover:bg-accent-600')
                  }
                >
                  {savingStatus ? 'Saving…' : confirmStatus === 'accepted' ? 'Yes, accept' : 'Yes, reject'}
                </button>
                <button
                  type="button"
                  disabled={savingStatus !== ''}
                  onClick={function () {
                    setConfirmStatus('');
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {app.status !== 'accepted' && (
                <button
                  type="button"
                  onClick={function () {
                    askToConfirm('accepted');
                  }}
                  className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/30"
                >
                  Accept
                </button>
              )}
              {app.status !== 'rejected' && (
                <button
                  type="button"
                  onClick={function () {
                    askToConfirm('rejected');
                  }}
                  className="rounded-lg border border-accent-500 bg-white px-4 py-3 text-sm font-semibold text-accent-600 transition hover:bg-accent-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/20"
                >
                  Reject
                </button>
              )}
              {app.status !== 'pending' && (
                <button
                  type="button"
                  disabled={savingStatus !== ''}
                  onClick={function () {
                    changeStatus('pending', false);
                  }}
                  className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                >
                  {savingStatus === 'pending' ? 'Saving…' : 'Move back to pending'}
                </button>
              )}
            </div>
          )}

          {/* Visited the office: HR ticks this when the student comes in (interview, walk-in, joining) */}
          <label
            className={
              'mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border px-3.5 py-3 transition ' +
              (app.visitedAt ? 'border-sky-200 bg-sky-50' : 'border-slate-200 bg-white hover:border-slate-300')
            }
          >
            <input
              type="checkbox"
              checked={Boolean(app.visitedAt)}
              disabled={isSavingVisit}
              onChange={function (event) {
                handleVisited(event.target.checked);
              }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-sky-700"
            />
            <span className="text-[13px] leading-snug">
              <span className="block font-semibold text-slate-900">
                {isSavingVisit ? 'Saving…' : 'Student visited the office'}
              </span>
              <span className="block text-slate-500">
                {app.visitedAt
                  ? formatDateTime(app.visitedAt) + (app.visitedBy ? ' · marked by ' + app.visitedBy.name : '')
                  : 'Tick when the student comes for the interview or joining.'}
              </span>
            </span>
          </label>

          {/* Joined: HR ticks this when the student starts the internship */}
          <label
            className={
              'mt-2 flex cursor-pointer items-start gap-2.5 rounded-xl border px-3.5 py-3 transition ' +
              (app.joinedAt ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300')
            }
          >
            <input
              type="checkbox"
              checked={Boolean(app.joinedAt) || confirmJoin}
              disabled={isSavingJoin}
              onChange={function (event) {
                handleJoinedTick(event.target.checked);
              }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-700"
            />
            <span className="text-[13px] leading-snug">
              <span className="block font-semibold text-slate-900">
                {isSavingJoin ? 'Saving…' : 'Student joined the internship'}
              </span>
              <span className="block text-slate-500">
                {app.joinedAt
                  ? formatDateTime(app.joinedAt) + (app.joinedBy ? ' · marked by ' + app.joinedBy.name : '')
                  : 'Tick when the student joins. It accepts the application and sends the joining confirmation email.'}
              </span>
            </span>
          </label>
        </div>
      </div>

      {statusMessage.text && (
        <div
          role="status"
          className={
            'mt-4 rounded-lg border px-4 py-3 text-sm ' +
            (statusMessage.isWarning
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800')
          }
        >
          {statusMessage.text}
        </div>
      )}

      {/* Same phone or email applied before / after: the whole history of this person */}
      {app.otherApplications && app.otherApplications.length > 0 && (
        <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60">
          <div className="border-b border-amber-200 px-4 py-3 sm:px-5">
            <h2 className="text-[15px] font-bold text-amber-900">
              {app.earlierCount > 0
                ? 'Returning applicant — this is the ' + ordinal(app.earlierCount + 1) + ' application of this person'
                : 'This person applied again later'}
            </h2>
            <p className="mt-0.5 text-[13px] text-amber-800">
              Matched by the same phone number or email. All {app.otherApplications.length + 1} applications are listed, newest first.
            </p>
          </div>
          <ul className="divide-y divide-amber-100">
            {[{ ...app, isCurrent: true }]
              .concat(app.otherApplications)
              .sort(function (a, b) {
                return new Date(b.createdAt) - new Date(a.createdAt) || b.id - a.id;
              })
              .map(function (item) {
                return (
                  <li key={item.id} className={'flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5' + (item.isCurrent ? ' bg-white/70' : '')}>
                    <div className="min-w-0 text-sm">
                      {item.isCurrent ? (
                        <span className="font-semibold text-slate-900">{item.referenceNo} (this one)</span>
                      ) : (
                        <Link to={'/admin/applications/' + item.id} className="font-semibold text-brand-700 hover:underline">
                          {item.referenceNo}
                        </Link>
                      )}
                      <span className="text-slate-600">
                        {' · '}
                        {formatDateTime(item.createdAt)} · {item.technologies.join(', ')}
                        {item.internshipType && ' · ' + item.internshipType}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <StatusBadge status={item.status} />
                      {item.visitedAt && <VisitedTag />}
                      {item.joinedAt && <JoinedTag />}
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>
      )}

      {actionError && (
        <div role="alert" className="mt-4 rounded-lg border border-accent-100 bg-accent-50 px-4 py-3 text-sm text-accent-600">
          {actionError}
        </div>
      )}

      {/* ---------- Details ---------- */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Section title="Personal information">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail label="Full name" value={app.fullName} />
              <Detail label="Gender" value={app.gender} />
              <Detail label="Contact number" value={'+91 ' + formatPhone(app.contactNumber)} />
              <Detail label="Parent contact number" value={'+91 ' + formatPhone(app.parentContactNumber)} />
              <Detail label="Email" value={app.email} wide />
              <Detail label="Address" value={app.address} wide />
            </dl>
          </Section>

          <Section title="Education">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail label="Current status" value={app.educationStatus === 'passout' ? 'Passout (finished studies)' : 'Pursuing (still studying)'} wide />
              <Detail label="Qualification" value={app.qualification} />
              <Detail label="Specialization" value={app.specialization} />
              <Detail label="College / University" value={app.institute} wide />
              {app.educationStatus === 'passout' ? (
                <Detail label="Training center / Company" value={app.trainingCenter} wide />
              ) : (
                <Detail label="Current semester" value={app.semester ? 'Semester ' + app.semester : ''} />
              )}
              <Detail label="Passout year" value={String(app.passoutYear)} />
            </dl>
          </Section>

          <Section title="Internship details">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail label="Internship type" value={app.internshipType ? app.internshipType + ' internship' : 'Not specified'} wide />
              <Detail label={app.technologies.length > 1 ? 'Technologies' : 'Technology'} value={app.technologies.join(', ')} />
              <Detail label={app.durations.length > 1 ? 'Durations' : 'Duration'} value={app.durations.join(', ')} />
              <Detail label="Location" value={app.location} />
              <Detail label="Mode" value={app.mode} />
              <Detail label="Project included" value={app.projectIncluded ? 'Yes' : 'No'} />
              <Detail label="Reference" value={app.reference} />
              <Detail label="Letters required" value={app.letters.join(', ')} wide />
            </dl>
          </Section>

          <Section title="Documents">
            <ul className="grid gap-3 sm:grid-cols-2">
              {DOCUMENTS.map(function (documentConfig) {
                const saved = app.documents ? app.documents[documentConfig.name] : null;
                // The course certificate is only on the form for passout students
                if (documentConfig.onlyPassout && app.educationStatus !== 'passout' && !saved) {
                  return null;
                }
                return (
                  <li key={documentConfig.name} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">{documentConfig.label}</p>
                    {saved ? (
                      <>
                        <p className="mt-0.5 truncate text-[13px] text-slate-500" title={saved.originalName}>
                          {saved.originalName} · {formatFileSize(saved.size)}
                        </p>
                        <div className="mt-2.5 flex gap-2">
                          <button
                            type="button"
                            disabled={openingDocument !== ''}
                            onClick={function () {
                              handleDocument(documentConfig, false);
                            }}
                            className="flex-1 rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
                          >
                            {openingDocument === documentConfig.name + '-view' ? 'Opening…' : 'View'}
                          </button>
                          <button
                            type="button"
                            disabled={openingDocument !== ''}
                            onClick={function () {
                              handleDocument(documentConfig, true);
                            }}
                            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          >
                            {openingDocument === documentConfig.name + '-download' ? 'Downloading…' : 'Download'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="mt-0.5 text-[13px] text-slate-400">Not uploaded</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section title="Declaration">
            <p className="text-sm text-slate-700">
              {app.declarationAccepted ? 'The applicant accepted the declaration and terms.' : 'Not accepted'}
            </p>
          </Section>
        </div>

        <div className="space-y-5">
          <NotesSection application={app} admin={admin} isSuperadmin={isSuperadmin} onUpdated={setApplication} />

          <FeesSection application={app} admin={admin} isSuperadmin={isSuperadmin} onUpdated={setApplication} />

          <CertificatesSection application={app} isSuperadmin={isSuperadmin} onUpdated={setApplication} />
        </div>
      </div>

      {confirmAction === 'trash' && (
        <ConfirmDialog
          title={'Move ' + app.fullName + ' to the trash?'}
          message="HR will not see it any more. You can restore it from the Trash page for 30 days; after that it is deleted for ever with its documents."
          confirmLabel="Move to trash"
          danger
          busy={isBusy}
          onConfirm={handleTrash}
          onCancel={function () {
            setConfirmAction('');
          }}
        />
      )}
    </AdminLayout>
  );
}

export default ApplicationDetailPage;
