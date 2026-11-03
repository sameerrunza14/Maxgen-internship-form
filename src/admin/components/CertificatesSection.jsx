import { useRef, useState } from 'react';
import { ConfirmDialog, useErrorHandler } from './AdminUi';
import { uploadCertificate, openCertificate, deleteCertificate, emailCertificate, sendCertificateOnWhatsapp } from '../adminApi';
import { formatDateTime, formatFileSize } from '../formatters';

// The 3 letters HR gives to the student. Keep the keys the same as
// CERTIFICATE_TYPES in backend/src/constants/applicationOptions.js
const CERTIFICATES = [
  { type: 'offerLetter', label: 'Offer / Joining Letter' },
  { type: 'completionCertificate', label: 'Completion Certificate' },
  { type: 'experienceLetter', label: 'Experience Letter' },
];

const MAX_SIZE_MB = 2;

function cleanText(text) {
  return text.replace(/[^A-Za-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Green tick when the PDF is uploaded, empty grey circle when not
function TickCircle({ done }) {
  if (done) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white" aria-hidden="true">
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
        </svg>
      </span>
    );
  }
  return <span className="h-6 w-6 shrink-0 rounded-full border-2 border-slate-300" aria-hidden="true" />;
}

/**
 * "Letters & certificates" box on the application page.
 * HR and superadmin: upload a PDF (or replace it), view, download.
 * Superadmin: remove.
 */
function CertificatesSection({ application, isSuperadmin, onUpdated }) {
  const handleError = useErrorHandler();
  const fileInputRef = useRef(null);
  // Which letter the file picker is open for
  const [pickingType, setPickingType] = useState('');
  // What is running now, e.g. "offerLetter-upload", "offerLetter-view"
  const [busy, setBusy] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [removing, setRemoving] = useState(null);
  // The letter waiting for "Send email?" confirmation
  const [emailing, setEmailing] = useState(null);

  const certificates = application.certificates || {};
  const canChange = !application.deletedAt;

  let givenCount = 0;
  for (let i = 0; i < CERTIFICATES.length; i++) {
    if (certificates[CERTIFICATES[i].type]) {
      givenCount = givenCount + 1;
    }
  }

  function setError(type, text) {
    const next = { ...errors };
    if (text) {
      next[type] = text;
    } else {
      delete next[type];
    }
    setErrors(next);
  }

  function chooseFile(type) {
    setPickingType(type);
    setMessage('');
    setError(type, '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }

  async function handleFileChosen(event) {
    const file = event.target.files && event.target.files[0];
    const type = pickingType;
    if (!file || !type) {
      return;
    }
    // Quick checks in the browser; the server checks again
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError(type, 'Please choose a PDF file.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(type, 'PDF must be ' + MAX_SIZE_MB + ' MB or less.');
      return;
    }

    setBusy(type + '-upload');
    try {
      const result = await uploadCertificate(application.id, type, file);
      onUpdated(result.application);
      setMessage(result.message);
    } catch (error) {
      if (error.fieldErrors && error.fieldErrors.file) {
        setError(type, error.fieldErrors.file);
      } else {
        handleError(error, function (text) {
          setError(type, text);
        });
      }
    } finally {
      setBusy('');
    }
  }

  async function handleOpen(item, download) {
    setBusy(item.type + (download ? '-download' : '-view'));
    setError(item.type, '');
    try {
      const fileName = application.referenceNo + ' - ' + cleanText(application.fullName) + ' - ' + cleanText(item.label) + '.pdf';
      await openCertificate(application.id, item.type, fileName, download);
    } catch (error) {
      handleError(error, function (text) {
        setError(item.type, text);
      });
    } finally {
      setBusy('');
    }
  }

  async function handleEmail() {
    const item = emailing;
    setBusy(item.type + '-email');
    setMessage('');
    setError(item.type, '');
    try {
      const result = await emailCertificate(application.id, item.type);
      onUpdated(result.application);
      setMessage(result.message);
      setEmailing(null);
    } catch (error) {
      setEmailing(null);
      handleError(error, function (text) {
        setError(item.type, text);
      });
    } finally {
      setBusy('');
    }
  }

  async function handleWhatsapp(item) {
    setBusy(item.type + '-whatsapp');
    setMessage('');
    setError(item.type, '');
    try {
      const result = await sendCertificateOnWhatsapp(application.id, item.type);
      onUpdated(result.application);
      setMessage('WhatsApp opened with the message and download link. Press Send in WhatsApp.');
    } catch (error) {
      handleError(error, function (text) {
        setError(item.type, text);
      });
    } finally {
      setBusy('');
    }
  }

  async function handleRemove() {
    const item = removing;
    setBusy(item.type + '-remove');
    try {
      const result = await deleteCertificate(application.id, item.type);
      onUpdated(result.application);
      setMessage(result.message);
      setRemoving(null);
    } catch (error) {
      setRemoving(null);
      handleError(error, function (text) {
        setError(item.type, text);
      });
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 sm:px-5">
        <h2 className="text-[15px] font-bold text-slate-900">Letters &amp; certificates</h2>
        <span
          className={
            'rounded-full px-2 py-0.5 text-xs font-semibold ' +
            (givenCount === CERTIFICATES.length ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-600')
          }
        >
          {givenCount} of {CERTIFICATES.length} given
        </span>
      </div>

      <div className="px-4 py-4 sm:px-5">
        {/* One hidden file picker, used by every "Upload PDF" / "Replace" button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handleFileChosen}
          aria-hidden="true"
          tabIndex={-1}
        />

        {message && (
          <p role="status" className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-[13px] font-medium text-emerald-800">
            {message}
          </p>
        )}

        <ul className="space-y-3">
          {CERTIFICATES.map(function (item) {
            const saved = certificates[item.type];
            const isUploading = busy === item.type + '-upload';
            return (
              <li
                key={item.type}
                className={'rounded-lg border p-3 ' + (saved ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200')}
              >
                <div className="flex items-start gap-3">
                  <TickCircle done={Boolean(saved)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    {saved ? (
                      <p className="mt-0.5 text-[13px] text-slate-500">
                        Given · {formatDateTime(saved.uploadedAt)}
                        {saved.uploadedByName ? ' by ' + saved.uploadedByName : ''}
                        <span className="block truncate" title={saved.originalName}>
                          {saved.originalName} · {formatFileSize(saved.size)}
                        </span>
                        {saved.emailedAt && (
                          <span className="mt-0.5 block font-medium text-sky-700">
                            ✉ Emailed · {formatDateTime(saved.emailedAt)}
                            {saved.emailedByName ? ' by ' + saved.emailedByName : ''}
                          </span>
                        )}
                        {saved.whatsappAt && (
                          <span className="mt-0.5 block font-medium text-emerald-700">
                            WhatsApp opened · {formatDateTime(saved.whatsappAt)}
                            {saved.whatsappByName ? ' by ' + saved.whatsappByName : ''}
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[13px] text-slate-400">Not given yet</p>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-2 sm:pl-9">
                  {saved && (
                    <>
                      <button
                        type="button"
                        disabled={busy !== ''}
                        onClick={function () {
                          handleOpen(item, false);
                        }}
                        className="rounded-lg bg-brand-700 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
                      >
                        {busy === item.type + '-view' ? 'Opening…' : 'View'}
                      </button>
                      <button
                        type="button"
                        disabled={busy !== ''}
                        onClick={function () {
                          handleOpen(item, true);
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        {busy === item.type + '-download' ? 'Downloading…' : 'Download'}
                      </button>
                    </>
                  )}
                  {canChange && (
                    <button
                      type="button"
                      disabled={busy !== ''}
                      onClick={function () {
                        chooseFile(item.type);
                      }}
                      className={
                        saved
                          ? 'rounded-lg px-3 py-1.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60'
                          : 'rounded-lg border border-dashed border-brand-300 bg-brand-50 px-3 py-1.5 text-[13px] font-semibold text-brand-800 hover:bg-brand-100 disabled:opacity-60'
                      }
                    >
                      {isUploading ? 'Uploading…' : saved ? 'Replace' : 'Upload PDF'}
                    </button>
                  )}
                  {canChange && saved && isSuperadmin && (
                    <button
                      type="button"
                      disabled={busy !== ''}
                      onClick={function () {
                        setRemoving(item);
                      }}
                      className="rounded-lg px-3 py-1.5 text-[13px] font-semibold text-accent-600 hover:bg-accent-50 disabled:opacity-60"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {saved && canChange && (
                  <div className="mt-2 flex flex-wrap gap-2 border-t border-emerald-100 pt-2 sm:pl-9">
                    <span className="self-center text-xs font-medium text-slate-500">Send to student:</span>
                    <button
                      type="button"
                      disabled={busy !== ''}
                      onClick={function () {
                        handleWhatsapp(item);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#1fa855] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#178a45] disabled:opacity-60"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.3-.4.7-1.3a.4.4 0 000-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.8 11.9 11.9 0 004.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 001.8-1.3 2.3 2.3 0 00.2-1.3c-.1-.1-.3-.2-.5-.3z" /></svg>
                      {busy === item.type + '-whatsapp' ? 'Opening…' : 'WhatsApp'}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== ''}
                      onClick={function () {
                        setEmailing(item);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M3 4a2 2 0 00-2 2v.4l9 4.8 9-4.8V6a2 2 0 00-2-2H3z" /><path d="M19 8.6l-9 4.8-9-4.8V14a2 2 0 002 2h14a2 2 0 002-2V8.6z" /></svg>
                      {busy === item.type + '-email' ? 'Sending…' : 'Email'}
                    </button>
                  </div>
                )}

                {errors[item.type] && (
                  <p role="alert" className="mt-2 text-[13px] font-medium text-accent-600 sm:pl-9">
                    {errors[item.type]}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          PDF only, up to {MAX_SIZE_MB} MB. WhatsApp sends a download link (WhatsApp links cannot carry a file); Email attaches the PDF.
          Every upload and send is saved in the activity log.
        </p>
      </div>

      {emailing && (
        <ConfirmDialog
          title={'Email the ' + emailing.label + '?'}
          message={'The PDF will be sent as an attachment to ' + application.email + '. An email cannot be taken back.'}
          confirmLabel="Send email"
          busy={busy === emailing.type + '-email'}
          onConfirm={handleEmail}
          onCancel={function () {
            setEmailing(null);
          }}
        />
      )}

      {removing && (
        <ConfirmDialog
          title={'Remove the ' + removing.label + '?'}
          message="The PDF is deleted from the server. The activity log keeps a record that it was removed."
          confirmLabel="Remove"
          danger
          busy={busy === removing.type + '-remove'}
          onConfirm={handleRemove}
          onCancel={function () {
            setRemoving(null);
          }}
        />
      )}
    </section>
  );
}

export default CertificatesSection;
