import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import StatusBadge from '../components/StatusBadge';
import { getApplication, updateStatus, openDocument, SessionExpiredError } from '../adminApi';
import { formatDateTime, formatPhone, formatFileSize } from '../formatters';
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
  const [application, setApplication] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [savingStatus, setSavingStatus] = useState('');
  const [confirmStatus, setConfirmStatus] = useState(''); // 'accepted' or 'rejected' while asking "Are you sure?"
  const [openingDocument, setOpeningDocument] = useState('');

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

  async function changeStatus(status) {
    setSavingStatus(status);
    setActionError('');
    try {
      const updated = await updateStatus(id, status);
      setApplication(updated);
      setConfirmStatus('');
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
          if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
          } else {
            navigate('/admin');
          }
        }}
        className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
      >
        ← All applications
      </button>

      {/* ---------- Header ---------- */}
      <div className="mt-4 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{app.fullName}</h1>
            <StatusBadge status={app.status} large />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {app.referenceNo} · Applied {formatDateTime(app.createdAt)}
          </p>
          <p className="mt-3 text-[15px] font-semibold text-brand-800">
            {app.technology} · {app.duration} · {app.location} ({app.mode})
          </p>
          {app.reviewedBy && app.status !== 'pending' && (
            <p className="mt-2 text-[13px] text-slate-500">
              Marked {app.status} by {app.reviewedBy.name} on {formatDateTime(app.reviewedAt)}
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
        </div>

        {/* Accept / Reject */}
        <div className="shrink-0 lg:w-72">
          {confirmStatus ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                {confirmStatus === 'accepted' ? 'Accept this application?' : 'Reject this application?'}
              </p>
              <p className="mt-1 text-[13px] text-slate-500">You can change this later.</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={savingStatus !== ''}
                  onClick={function () {
                    changeStatus(confirmStatus);
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
                    setConfirmStatus('accepted');
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
                    setConfirmStatus('rejected');
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
                    changeStatus('pending');
                  }}
                  className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                >
                  {savingStatus === 'pending' ? 'Saving…' : 'Move back to pending'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

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
              <Detail label="Qualification" value={app.qualification} />
              <Detail label="Specialization" value={app.specialization} />
              <Detail label="Institute / training center" value={app.institute} wide />
              <Detail label="Current semester" value={'Semester ' + app.semester} />
              <Detail label="Passout year" value={String(app.passoutYear)} />
            </dl>
          </Section>

          <Section title="Internship details">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail label="Technology" value={app.technology} />
              <Detail label="Duration" value={app.duration} />
              <Detail label="Location" value={app.location} />
              <Detail label="Mode" value={app.mode} />
              <Detail label="Project included" value={app.projectIncluded ? 'Yes' : 'No'} />
              <Detail label="Reference" value={app.reference} />
              <Detail label="Letters required" value={app.letters.join(', ')} wide />
            </dl>
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="Documents">
            <ul className="space-y-3">
              {DOCUMENTS.map(function (documentConfig) {
                const saved = app.documents ? app.documents[documentConfig.name] : null;
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
      </div>
    </AdminLayout>
  );
}

export default ApplicationDetailPage;
