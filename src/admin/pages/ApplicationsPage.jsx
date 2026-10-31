import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import StatusBadge from '../components/StatusBadge';
import { listApplications, getStats, SessionExpiredError } from '../adminApi';
import { formatDate, formatPhone } from '../formatters';
import { TECHNOLOGIES, LOCATIONS, INTERNSHIP_MODES } from '../../constants/formOptions';

const STATUS_TABS = [
  { value: '', label: 'All', statKey: 'total' },
  { value: 'pending', label: 'Pending', statKey: 'pending' },
  { value: 'accepted', label: 'Accepted', statKey: 'accepted' },
  { value: 'rejected', label: 'Rejected', statKey: 'rejected' },
];

const selectClass =
  'w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-8 text-sm text-slate-800 ' +
  'focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15';

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={function (event) {
          onChange(event.target.value);
        }}
        className={selectClass + (value ? ' border-brand-600 font-medium text-brand-800' : '')}
      >
        <option value="">{label}: All</option>
        {options.map(function (option) {
          return (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          );
        })}
      </select>
      <svg className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
      </svg>
    </label>
  );
}

function ApplicationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // The filters live in the page address (?status=pending&page=2), so Back / Refresh keep them
  const filters = {
    page: Number(searchParams.get('page')) || 1,
    status: searchParams.get('status') || '',
    technology: searchParams.get('technology') || '',
    location: searchParams.get('location') || '',
    mode: searchParams.get('mode') || '',
    search: searchParams.get('search') || '',
  };

  const [searchText, setSearchText] = useState(filters.search);
  const [stats, setStats] = useState(null);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  function updateFilter(name, value) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }
    if (name !== 'page') {
      next.delete('page'); // a new filter starts again from page 1
    }
    setSearchParams(next);
  }

  function clearFilters() {
    setSearchText('');
    setSearchParams(new URLSearchParams());
  }

  function handleError(loadError) {
    if (loadError instanceof SessionExpiredError) {
      navigate('/admin/login', { replace: true, state: { from: '/admin' } });
      return;
    }
    setError(loadError.message);
  }

  // Wait until the admin stops typing for a moment, then search
  useEffect(
    function () {
      const timer = setTimeout(function () {
        if (searchText.trim() !== filters.search) {
          updateFilter('search', searchText.trim());
        }
      }, 400);
      return function () {
        clearTimeout(timer);
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchText]
  );

  // Load the numbers at the top
  useEffect(function () {
    getStats().then(setStats).catch(handleError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the list whenever a filter changes
  const queryKey = searchParams.toString();
  useEffect(
    function () {
      let cancelled = false;
      setIsLoading(true);
      setError('');
      listApplications(filters)
        .then(function (result) {
          if (!cancelled) {
            setData(result);
            setIsLoading(false);
          }
        })
        .catch(function (loadError) {
          if (!cancelled) {
            setIsLoading(false);
            handleError(loadError);
          }
        });
      return function () {
        cancelled = true;
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryKey]
  );

  const technologyOptions = TECHNOLOGIES.map(function (item) {
    return { value: item.value, label: item.label };
  });
  const hasFilters = filters.status || filters.technology || filters.location || filters.mode || filters.search;
  const items = data ? data.items : [];
  const pagination = data ? data.pagination : null;

  return (
    <AdminLayout>
      {/* ---------- Heading + numbers ---------- */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Applications</h1>
          <p className="mt-1 text-sm text-slate-500">
            {stats ? stats.today + ' new today' : 'Loading…'}
          </p>
        </div>
      </div>

      {/* Status tabs with counts */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATUS_TABS.map(function (tab) {
          const isActive = filters.status === tab.value;
          return (
            <button
              key={tab.label}
              type="button"
              onClick={function () {
                updateFilter('status', tab.value);
              }}
              aria-pressed={isActive}
              className={
                'rounded-xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20 ' +
                (isActive ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-200 bg-white hover:border-brand-300')
              }
            >
              <span className={'block text-sm font-medium ' + (isActive ? 'text-brand-100' : 'text-slate-500')}>{tab.label}</span>
              <span className={'mt-0.5 block text-2xl font-extrabold tabular-nums ' + (isActive ? 'text-white' : 'text-slate-900')}>
                {stats ? stats[tab.statKey] : '–'}
              </span>
            </button>
          );
        })}
      </div>

      {/* ---------- Search + filters ---------- */}
      <div className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-[1fr_200px_160px_150px_auto]">
        <label className="relative block sm:col-span-2 lg:col-span-1">
          <span className="sr-only">Search</span>
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.39l3.08 3.08a.75.75 0 11-1.06 1.06l-3.08-3.08A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
          <input
            type="search"
            value={searchText}
            onChange={function (event) {
              setSearchText(event.target.value);
            }}
            placeholder="Search name, phone, email, application ID or college"
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15 sm:text-sm"
          />
        </label>
        <FilterSelect label="Technology" value={filters.technology} options={technologyOptions} onChange={function (value) { updateFilter('technology', value); }} />
        <FilterSelect label="Location" value={filters.location} options={LOCATIONS} onChange={function (value) { updateFilter('location', value); }} />
        <FilterSelect label="Mode" value={filters.mode} options={INTERNSHIP_MODES} onChange={function (value) { updateFilter('mode', value); }} />
        {hasFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg px-3 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            Clear filters
          </button>
        ) : (
          <span className="hidden lg:block" />
        )}
      </div>

      {error && (
        <div role="alert" className="mt-5 rounded-lg border border-accent-100 bg-accent-50 px-4 py-3 text-sm text-accent-600">
          {error}
        </div>
      )}

      {/* ---------- Results ---------- */}
      <div className={'mt-5 transition-opacity ' + (isLoading && data ? 'opacity-60' : '')}>
        {pagination && (
          <p className="mb-3 text-sm text-slate-500">
            {pagination.total === 0
              ? 'No applications found'
              : 'Showing ' + ((pagination.page - 1) * pagination.pageSize + 1) + '–' +
                Math.min(pagination.page * pagination.pageSize, pagination.total) + ' of ' + pagination.total}
          </p>
        )}

        {!data && isLoading && <p className="py-16 text-center text-sm text-slate-500">Loading applications…</p>}

        {data && items.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <p className="text-base font-semibold text-slate-800">
              {hasFilters ? 'No applications match these filters' : 'No applications yet'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {hasFilters ? 'Try another search or clear the filters.' : 'New applications from the website form will appear here.'}
            </p>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Clear filters
              </button>
            )}
          </div>
        )}

        {items.length > 0 && (
          <>
            {/* Table on laptop */}
            <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-[13px] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Applicant</th>
                    <th className="px-4 py-3 font-medium">Technology</th>
                    <th className="px-4 py-3 font-medium">Location · Mode</th>
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">Duration</th>
                    <th className="px-4 py-3 font-medium">Applied</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map(function (item) {
                    return (
                      <tr
                        key={item._id}
                        onClick={function () {
                          navigate('/admin/applications/' + item._id);
                        }}
                        className="cursor-pointer transition-colors hover:bg-brand-50/50"
                      >
                        <td className="px-4 py-3">
                          <Link
                            to={'/admin/applications/' + item._id}
                            onClick={function (event) {
                              event.stopPropagation();
                            }}
                            className="font-semibold text-slate-900 hover:text-brand-700 focus:outline-none focus-visible:underline"
                          >
                            {item.fullName}
                          </Link>
                          <span className="mt-0.5 block text-[13px] text-slate-500">
                            {formatPhone(item.contactNumber)} · {item.referenceNo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{item.technology}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.location} · {item.mode}
                        </td>
                        <td className="hidden px-4 py-3 text-slate-700 lg:table-cell">{item.duration}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(item.createdAt)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={item.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards on phone */}
            <ul className="space-y-3 md:hidden">
              {items.map(function (item) {
                return (
                  <li key={item._id}>
                    <Link
                      to={'/admin/applications/' + item._id}
                      className="block rounded-xl border border-slate-200 bg-white p-4 transition active:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-slate-900">{item.fullName}</p>
                          <p className="mt-0.5 text-[13px] text-slate-500">{formatPhone(item.contactNumber)}</p>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="mt-3 text-sm font-medium text-slate-800">{item.technology}</p>
                      <p className="mt-0.5 text-[13px] text-slate-500">
                        {item.location} · {item.mode} · {item.duration}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        {item.referenceNo} · Applied {formatDate(item.createdAt)}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {/* Page buttons */}
        {pagination && pagination.totalPages > 1 && (
          <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Pages">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={function () {
                updateFilter('page', String(pagination.page - 1));
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={function () {
                updateFilter('page', String(pagination.page + 1));
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        )}
      </div>
    </AdminLayout>
  );
}

export default ApplicationsPage;
