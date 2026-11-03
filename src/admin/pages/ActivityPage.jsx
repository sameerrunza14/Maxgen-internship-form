import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import DateFilter from '../components/DateFilter';
import { Alert, ConfirmDialog, PageTitle, dangerButton, secondaryButton, useErrorHandler } from '../components/AdminUi';
import { getActivity, trashActivity } from '../adminApi';
import { getDateRange } from '../dateRanges';
import { formatDateTime } from '../formatters';

// Colour of the small dot before each action
function actionColour(action) {
  if (action === 'login_failed' || action.includes('deleted') || action === 'trash_emptied' || action === 'status_rejected') {
    return 'bg-accent-500';
  }
  if (action === 'status_accepted' || action === 'application_restored') {
    return 'bg-emerald-500';
  }
  if (action.startsWith('user_') || action.startsWith('settings') || action.includes('trashed') || action === 'application_edited') {
    return 'bg-amber-500';
  }
  return 'bg-slate-300';
}

const selectClass =
  'cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-8 text-sm text-slate-800 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15';

function ActivityPage() {
  const handleError = useErrorHandler();
  const [dateValue, setDateValue] = useState({ period: '', from: '', to: '' });
  const [adminId, setAdminId] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState([]); // ids of ticked entries
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [notice, setNotice] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  const range = getDateRange(dateValue.period, dateValue.from, dateValue.to);
  const requestKey = [range.from, range.to, adminId, action, page, reloadCount].join('|');

  useEffect(
    function () {
      let cancelled = false;
      setIsLoading(true);
      setError('');
      getActivity({ page: page, adminId: adminId, action: action, from: range.from, to: range.to })
        .then(function (result) {
          if (!cancelled) {
            setData(result);
            setSelected([]);
            setIsLoading(false);
          }
        })
        .catch(function (loadError) {
          if (!cancelled) {
            setIsLoading(false);
            handleError(loadError, setError);
          }
        });
      return function () {
        cancelled = true;
      };
    },
    [requestKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Any filter change starts again from page 1
  function changeFilter(setter) {
    return function (value) {
      setter(value);
      setPage(1);
    };
  }

  const items = data ? data.items : [];
  const pagination = data ? data.pagination : null;

  // Entries that can be ticked (records of log changes are always kept)
  const selectableIds = [];
  for (let i = 0; i < items.length; i++) {
    if (!items[i].isProtected) {
      selectableIds.push(items[i].id);
    }
  }
  const allSelected = selectableIds.length > 0 && selected.length === selectableIds.length;

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
    setSelected(allSelected ? [] : selectableIds);
  }

  async function handleRemove() {
    setIsRemoving(true);
    setError('');
    try {
      const message = await trashActivity(selected);
      setNotice(message);
      setIsConfirming(false);
      setReloadCount(reloadCount + 1);
    } catch (removeError) {
      setIsConfirming(false);
      handleError(removeError, setError);
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <AdminLayout>
      <PageTitle title="Activity log" subtitle="Who did what in the admin panel. Removed entries go to the Trash for 30 days, and every removal is recorded here." />
      <Alert type="success" className="mt-5">{notice}</Alert>

      <div className="mt-5 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <label className="block">
          <span className="sr-only">Person</span>
          <select
            value={adminId}
            onChange={function (event) {
              changeFilter(setAdminId)(event.target.value);
            }}
            className={selectClass + (adminId ? ' border-brand-600 font-medium text-brand-800' : '')}
          >
            <option value="">Everyone</option>
            {data &&
              data.users.map(function (user) {
                return (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                );
              })}
          </select>
        </label>
        <label className="block">
          <span className="sr-only">Action</span>
          <select
            value={action}
            onChange={function (event) {
              changeFilter(setAction)(event.target.value);
            }}
            className={selectClass + ' max-w-[260px]' + (action ? ' border-brand-600 font-medium text-brand-800' : '')}
          >
            <option value="">All actions</option>
            {data &&
              data.actions.map(function (option) {
                return (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                );
              })}
          </select>
        </label>
        <DateFilter value={dateValue} onChange={changeFilter(setDateValue)} />
      </div>

      <Alert type="error" className="mt-5">{error}</Alert>

      <div className={'mt-5 transition-opacity ' + (isLoading && data ? 'opacity-60' : '')}>
        {!data && isLoading && <p className="py-16 text-center text-sm text-slate-500">Loading…</p>}
        {pagination && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              {selectableIds.length > 0 && (
                <label className="flex cursor-pointer items-center gap-2 font-medium text-slate-700">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-brand-700" />
                  Select all on this page
                </label>
              )}
              <span>{pagination.total === 0 ? 'Nothing found' : pagination.total + ' entries'}</span>
            </div>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={function () {
                  setNotice('');
                  setIsConfirming(true);
                }}
                className={dangerButton + ' !py-2'}
              >
                Move {selected.length} to trash
              </button>
            )}
          </div>
        )}

        {items.length > 0 && (
          <ol className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {items.map(function (item) {
              return (
                <li key={item.id} className={'flex gap-3 px-4 py-3' + (selected.includes(item.id) ? ' bg-accent-50/60' : '')}>
                  {item.isProtected ? (
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-slate-400" title="Records of log changes are always kept">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                      </svg>
                    </span>
                  ) : (
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={function () {
                        toggleOne(item.id);
                      }}
                      aria-label={'Select entry: ' + item.adminName + ' ' + item.actionLabel}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-700"
                    />
                  )}
                  <span className={'mt-1.5 h-2 w-2 shrink-0 rounded-full ' + actionColour(item.action)} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800">
                      <span className="font-semibold text-slate-900">{item.adminName}</span> · {item.actionLabel}
                      {item.referenceNo && (
                        <>
                          {' · '}
                          {item.applicationId ? (
                            <Link to={'/admin/applications/' + item.applicationId} className="font-medium text-brand-700 hover:underline">
                              {item.referenceNo}
                            </Link>
                          ) : (
                            <span className="font-medium">{item.referenceNo}</span>
                          )}
                        </>
                      )}
                    </p>
                    {item.details && <p className="mt-0.5 break-words text-[13px] text-slate-600">{item.details}</p>}
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatDateTime(item.createdAt)}
                      {item.ipAddress && ' · IP ' + item.ipAddress}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {pagination && pagination.totalPages > 1 && (
          <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Pages">
            <button
              type="button"
              disabled={page <= 1}
              onClick={function () {
                setPage(page - 1);
              }}
              className={secondaryButton}
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={function () {
                setPage(page + 1);
              }}
              className={secondaryButton}
            >
              Next
            </button>
          </nav>
        )}
      </div>

      {isConfirming && (
        <ConfirmDialog
          title={'Move ' + selected.length + (selected.length === 1 ? ' entry' : ' entries') + ' to the trash?'}
          message="They are hidden from the activity log. You can restore them from Trash → Activity log for 30 days. This removal itself is recorded in the log."
          confirmLabel="Move to trash"
          danger
          busy={isRemoving}
          onConfirm={handleRemove}
          onCancel={function () {
            setIsConfirming(false);
          }}
        />
      )}
    </AdminLayout>
  );
}

export default ActivityPage;
