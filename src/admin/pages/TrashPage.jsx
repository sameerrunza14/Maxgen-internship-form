import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import StatusBadge from '../components/StatusBadge';
import { Alert, ConfirmDialog, PageTitle, dangerButton, secondaryButton, useErrorHandler } from '../components/AdminUi';
import {
  listApplications,
  restoreApplication,
  deleteForever,
  emptyTrash,
  getActivity,
  restoreActivity,
  deleteActivityForever,
} from '../adminApi';
import { formatDate, formatDateTime, formatPhone } from '../formatters';

// Days left before the automatic permanent delete
function daysLeft(deletedAt, keepDays) {
  const deleteOn = new Date(deletedAt).getTime() + keepDays * 24 * 60 * 60 * 1000;
  return Math.max(Math.ceil((deleteOn - Date.now()) / (24 * 60 * 60 * 1000)), 0);
}

// ---------- Tab 1: deleted applications ----------
function ApplicationsTrash() {
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
    <>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Deleted applications stay here for {keepDays} days, then they are deleted for ever with their documents.
        </p>
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
      </div>

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
    </>
  );
}

// ---------- Tab 2: removed activity log entries ----------
function ActivityTrash() {
  const handleError = useErrorHandler();
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [isBusy, setIsBusy] = useState(false);
  const [selected, setSelected] = useState([]);
  const [confirm, setConfirm] = useState(null); // 'selected' | 'all'
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(
    function () {
      getActivity({ trash: 'true', page: page })
        .then(function (result) {
          setData(result);
          setSelected([]);
        })
        .catch(function (error) {
          handleError(error, function (message) {
            setNotice({ type: 'error', text: message });
          });
        });
    },
    [page, reloadCount] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const items = data ? data.items : [];
  const pagination = data ? data.pagination : null;
  const keepDays = data ? data.trashKeepDays : 30;
  const allSelected = items.length > 0 && selected.length === items.length;

  function toggleOne(id) {
    if (selected.includes(id)) {
      setSelected(
        selected.filter(function (item) {
          return item !== id;
        })
      );
    } else {
      setSelected(selected.concat([id]));
    }
  }

  function toggleAll() {
    if (allSelected) {
      setSelected([]);
      return;
    }
    const ids = [];
    for (let i = 0; i < items.length; i++) {
      ids.push(items[i].id);
    }
    setSelected(ids);
  }

  // work = a function that calls the API and returns the message
  async function run(work) {
    setIsBusy(true);
    setNotice({ type: '', text: '' });
    try {
      const message = await work();
      setNotice({ type: 'success', text: message });
      setConfirm(null);
      setPage(1);
      setReloadCount(reloadCount + 1);
    } catch (error) {
      setConfirm(null);
      handleError(error, function (message) {
        setNotice({ type: 'error', text: message });
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Removed log entries stay here for {keepDays} days, then they are deleted for ever.
        </p>
        {pagination && pagination.total > 0 && (
          <button
            type="button"
            disabled={isBusy}
            onClick={function () {
              setConfirm('all');
            }}
            className={dangerButton}
          >
            Empty log trash
          </button>
        )}
      </div>

      <Alert type={notice.type} className="mt-5">{notice.text}</Alert>

      <div className="mt-5">
        {!data && !notice.text && <p className="py-16 text-center text-sm text-slate-500">Loading…</p>}
        {data && items.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <p className="text-base font-semibold text-slate-800">No removed log entries</p>
            <p className="mt-1 text-sm text-slate-500">Entries you remove from the activity log will appear here first.</p>
          </div>
        )}

        {items.length > 0 && (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-brand-700" />
                Select all on this page
                <span className="font-normal text-slate-500">({pagination.total} in trash)</span>
              </label>
              {selected.length > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={function () {
                      run(function () {
                        return restoreActivity(selected);
                      });
                    }}
                    className={secondaryButton + ' !py-2'}
                  >
                    {isBusy && !confirm ? 'Restoring…' : 'Restore ' + selected.length}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={function () {
                      setConfirm('selected');
                    }}
                    className={dangerButton + ' !py-2'}
                  >
                    Delete {selected.length} for ever
                  </button>
                </div>
              )}
            </div>

            <ol className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {items.map(function (item) {
                const left = daysLeft(item.deletedAt, keepDays);
                return (
                  <li key={item.id} className={'flex gap-3 px-4 py-3' + (selected.includes(item.id) ? ' bg-brand-50/60' : '')}>
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={function () {
                        toggleOne(item.id);
                      }}
                      aria-label={'Select entry: ' + item.adminName + ' ' + item.actionLabel}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-700"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-800">
                        <span className="font-semibold text-slate-900">{item.adminName}</span> · {item.actionLabel}
                        {item.referenceNo && ' · ' + item.referenceNo}
                      </p>
                      {item.details && <p className="mt-0.5 break-words text-[13px] text-slate-600">{item.details}</p>}
                      <p className="mt-0.5 text-xs text-slate-400">
                        {formatDateTime(item.createdAt)} · removed {formatDate(item.deletedAt)}
                        {item.deletedByName && ' by ' + item.deletedByName} ·{' '}
                        <span className={left <= 3 ? 'font-semibold text-accent-600' : ''}>
                          {left === 0 ? 'deleted for ever today' : left + (left === 1 ? ' day' : ' days') + ' left'}
                        </span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
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
          title={confirm === 'all' ? 'Empty the log trash?' : 'Delete ' + selected.length + ' log entr' + (selected.length === 1 ? 'y' : 'ies') + ' for ever?'}
          message={
            (confirm === 'all' ? 'All ' + pagination.total + ' removed entries are' : 'The selected entries are') +
            ' deleted permanently. This cannot be undone. A record of this is kept in the activity log.'
          }
          confirmLabel="Delete for ever"
          danger
          typeToConfirm="DELETE"
          busy={isBusy}
          onConfirm={function () {
            run(function () {
              return deleteActivityForever(confirm === 'all' ? null : selected);
            });
          }}
          onCancel={function () {
            setConfirm(null);
          }}
        />
      )}
    </>
  );
}

// ---------- The page: two tabs ----------
const TABS = [
  { value: 'applications', label: 'Applications' },
  { value: 'activity', label: 'Activity log' },
];

function TrashPage() {
  // ?tab=activity keeps the tab after a refresh
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'activity' ? 'activity' : 'applications';

  return (
    <AdminLayout>
      <PageTitle title="Trash" subtitle="Everything deleted in the admin panel can be restored from here for 30 days." />

      <div className="mt-5 inline-flex rounded-lg border border-slate-200 bg-white p-1" role="tablist">
        {TABS.map(function (item) {
          const isActive = tab === item.value;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={function () {
                setSearchParams(item.value === 'activity' ? { tab: 'activity' } : {});
              }}
              className={
                'rounded-md px-4 py-2 text-sm font-semibold transition ' +
                (isActive ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100')
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'activity' ? <ActivityTrash /> : <ApplicationsTrash />}
    </AdminLayout>
  );
}

export default TrashPage;
