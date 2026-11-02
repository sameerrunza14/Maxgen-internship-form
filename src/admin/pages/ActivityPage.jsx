import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import DateFilter from '../components/DateFilter';
import { Alert, PageTitle, secondaryButton, useErrorHandler } from '../components/AdminUi';
import { getActivity } from '../adminApi';
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

  const range = getDateRange(dateValue.period, dateValue.from, dateValue.to);
  const requestKey = [range.from, range.to, adminId, action, page].join('|');

  useEffect(
    function () {
      let cancelled = false;
      setIsLoading(true);
      setError('');
      getActivity({ page: page, adminId: adminId, action: action, from: range.from, to: range.to })
        .then(function (result) {
          if (!cancelled) {
            setData(result);
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

  return (
    <AdminLayout>
      <PageTitle title="Activity log" subtitle="Who did what in the admin panel. Nobody can change or delete this log." />

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
        {pagination && <p className="mb-3 text-sm text-slate-500">{pagination.total === 0 ? 'Nothing found' : pagination.total + ' entries'}</p>}

        {items.length > 0 && (
          <ol className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {items.map(function (item) {
              return (
                <li key={item.id} className="flex gap-3 px-4 py-3">
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
    </AdminLayout>
  );
}

export default ActivityPage;
