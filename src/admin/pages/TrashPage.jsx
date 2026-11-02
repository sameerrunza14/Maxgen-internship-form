import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import StatusBadge from '../components/StatusBadge';
import { Alert, ConfirmDialog, PageTitle, dangerButton, secondaryButton, useErrorHandler } from '../components/AdminUi';
import { listApplications, restoreApplication, deleteForever, emptyTrash } from '../adminApi';
import { formatDate, formatPhone } from '../formatters';

// Days left before the automatic permanent delete
function daysLeft(deletedAt, keepDays) {
  const deleteOn = new Date(deletedAt).getTime() + keepDays * 24 * 60 * 60 * 1000;
  return Math.max(Math.ceil((deleteOn - Date.now()) / (24 * 60 * 60 * 1000)), 0);
}

function TrashPage() {
  const handleError = useErrorHandler();
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind: 'one' | 'all', item }
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(
    function () {
      listApplications({ trash: 'true', page: page })
        .then(setData)
        .catch(function (error) {
          handleError(error, function (message) {
            setNotice({ type: 'error', text: message });
          });
        });
    },
    [page, reloadCount] // eslint-disable-line react-hooks/exhaustive-deps
  );

  function reload() {
    setReloadCount(reloadCount + 1);
  }

  function showError(error) {
    handleError(error, function (message) {
      setNotice({ type: 'error', text: message });
    });
  }

  async function handleRestore(item) {
    setBusyId(item.id);
    setNotice({ type: '', text: '' });
    try {
      await restoreApplication(item.id);
      setNotice({ type: 'success', text: item.fullName + ' (' + item.referenceNo + ') restored. HR can see it again.' });
      reload();
    } catch (error) {
      showError(error);
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmed() {
    setBusyId(confirm.kind === 'one' ? confirm.item.id : 'all');
    setNotice({ type: '', text: '' });
    try {
      const message = confirm.kind === 'one' ? await deleteForever(confirm.item.id) : await emptyTrash();
      setNotice({ type: 'success', text: message });
      setConfirm(null);
      setPage(1);
      reload();
    } catch (error) {
      setConfirm(null);
      showError(error);
    } finally {
      setBusyId(null);
    }
  }

  const items = data ? data.items : [];
  const pagination = data ? data.pagination : null;
  const keepDays = data ? data.trashKeepDays : 30;

  return (
    <AdminLayout>
      <PageTitle
        title="Trash"
        subtitle={'Deleted applications stay here for ' + keepDays + ' days, then they are deleted for ever with their documents.'}
      >
        {pagination && pagination.total > 0 && (
          <button
            type="button"
            disabled={busyId !== null}
            onClick={function () {
              setConfirm({ kind: 'all' });
            }}
            className={dangerButton}
          >
            Empty trash
          </button>
        )}
      </PageTitle>

      <Alert type={notice.type} className="mt-5">{notice.text}</Alert>

      <div className="mt-5">
        {!data && !notice.text && <p className="py-16 text-center text-sm text-slate-500">Loading…</p>}
        {data && items.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <p className="text-base font-semibold text-slate-800">The trash is empty</p>
            <p className="mt-1 text-sm text-slate-500">Applications you delete will appear here first.</p>
          </div>
        )}

        {items.length > 0 && (
          <ul className="space-y-3">
            {items.map(function (item) {
              const left = daysLeft(item.deletedAt, keepDays);
              return (
                <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <Link to={'/admin/applications/' + item.id} className="text-[15px] font-semibold text-slate-900 hover:text-brand-700">
                          {item.fullName}
                        </Link>
                        <StatusBadge status={item.status} />
                      </p>
                      <p className="mt-0.5 text-[13px] text-slate-500">
                        {formatPhone(item.contactNumber)} · {item.referenceNo} · {item.technologies.join(', ')} · Applied {formatDate(item.createdAt)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Deleted {formatDate(item.deletedAt)}
                        {item.deletedByName && ' by ' + item.deletedByName} ·{' '}
                        <span className={left <= 3 ? 'font-semibold text-accent-600' : ''}>
                          {left === 0 ? 'deleted for ever today' : left + (left === 1 ? ' day' : ' days') + ' left'}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={function () {
                          handleRestore(item);
                        }}
                        className={secondaryButton + ' flex-1 sm:flex-none'}
                      >
                        {busyId === item.id && !confirm ? 'Restoring…' : 'Restore'}
                      </button>
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={function () {
                          setConfirm({ kind: 'one', item: item });
                        }}
                        className={dangerButton + ' flex-1 sm:flex-none'}
                      >
                        Delete for ever
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {pagination && pagination.totalPages > 1 && (
          <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Pages">
            <button type="button" disabled={page <= 1} onClick={function () { setPage(page - 1); }} className={secondaryButton}>
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button type="button" disabled={page >= pagination.totalPages} onClick={function () { setPage(page + 1); }} className={secondaryButton}>
              Next
            </button>
          </nav>
        )}
      </div>

      {confirm && (
        <ConfirmDialog
          title={confirm.kind === 'one' ? 'Delete ' + confirm.item.fullName + ' for ever?' : 'Empty the trash?'}
          message={
            confirm.kind === 'one'
              ? 'The application ' + confirm.item.referenceNo + ', its notes and its documents are deleted permanently. This cannot be undone.'
              : 'All ' + pagination.total + ' application(s) in the trash, with their notes and documents, are deleted permanently. This cannot be undone.'
          }
          confirmLabel="Delete for ever"
          danger
          typeToConfirm="DELETE"
          busy={busyId !== null}
          onConfirm={handleConfirmed}
          onCancel={function () {
            setConfirm(null);
          }}
        />
      )}
    </AdminLayout>
  );
}

export default TrashPage;
