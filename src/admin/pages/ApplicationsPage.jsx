import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import StatusBadge from "../components/StatusBadge";
import { ReturningTag, ProgressSteps } from "../components/Tags";
import { Alert } from "../components/AdminUi";
import { useAdmin } from "../AdminAuth";
import {
  listApplications,
  getStats,
  downloadExcel,
  downloadBackup,
  getFormTechnologies,
  SessionExpiredError,
} from "../adminApi";
import { formatDate, formatPhone } from "../formatters";
import {
  TECHNOLOGIES,
  LOCATIONS,
  INTERNSHIP_MODES,
  INTERNSHIP_TYPES,
} from "../../constants/formOptions";
import {
  DATE_PERIODS,
  getDateRange,
  describeRange,
  toDateText,
} from "../dateRanges";

// "Visited" filter: students who came to the office (ticked by HR on the application page)
// Same phone number or email applied before?
const APPLICANT_OPTIONS = [
  { value: "returning", label: "Returning (applied before)" },
  { value: "new", label: "First time" },
];

// "Joined" filter: students who joined the internship (ticked by HR on the application page)
const JOINED_OPTIONS = [
  { value: "today", label: "Joined today" },
  { value: "yes", label: "Joined (any day)" },
  { value: "no", label: "Not joined" },
];

const VISITED_OPTIONS = [
  { value: "today", label: "Visited today" },
  { value: "yes", label: "Visited (any day)" },
  { value: "no", label: "Not visited" },
];

const TYPE_OPTIONS = INTERNSHIP_TYPES.map(function (item) {
  return { value: item.value, label: item.value };
});

const STATUS_TABS = [
  { value: "", label: "All", statKey: "total" },
  { value: "pending", label: "Pending", statKey: "pending" },
  { value: "accepted", label: "Accepted", statKey: "accepted" },
  { value: "rejected", label: "Rejected", statKey: "rejected" },
];

const selectClass =
  "w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-8 text-sm text-slate-800 " +
  "focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15";

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={function (event) {
          onChange(event.target.value);
        }}
        className={
          selectClass +
          (value ? " border-brand-600 font-medium text-brand-800" : "")
        }
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
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </label>
  );
}

function ApplicationsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSuperadmin } = useAdmin();
  // "Moved to trash" message from the detail page
  const trashedMessage =
    location.state && location.state.trashedMessage
      ? location.state.trashedMessage
      : "";
  const [formTechnologies, setFormTechnologies] = useState([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // The filters live in the page address (?status=pending&page=2), so Back / Refresh keep them
  const filters = {
    page: Number(searchParams.get("page")) || 1,
    status: searchParams.get("status") || "",
    technology: searchParams.get("technology") || "",
    location: searchParams.get("location") || "",
    mode: searchParams.get("mode") || "",
    internshipType: searchParams.get("internshipType") || "",
    visited: searchParams.get("visited") || "", // '', today, yes, no
    joined: searchParams.get("joined") || "", // '', today, yes, no
    applicant: searchParams.get("applicant") || "", // '', returning, new
    search: searchParams.get("search") || "",
    period: searchParams.get("period") || "", // '', today, yesterday, week, month, lastMonth, custom
    customFrom: searchParams.get("from") || "",
    customTo: searchParams.get("to") || "",
  };

  // The real dates for the chosen period, e.g. { from: '2026-10-25', to: '2026-10-31' }
  const dateRange = getDateRange(
    filters.period,
    filters.customFrom,
    filters.customTo,
  );

  // What is sent to the server (list and Excel)
  const requestFilters = {
    page: filters.page,
    status: filters.status,
    technology: filters.technology,
    location: filters.location,
    mode: filters.mode,
    internshipType: filters.internshipType,
    visited: filters.visited,
    joined: filters.joined,
    applicant: filters.applicant,
    search: filters.search,
    from: dateRange.from,
    to: dateRange.to,
  };

  const [searchText, setSearchText] = useState(filters.search);
  const [stats, setStats] = useState(null);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);
    setError("");
    try {
      await downloadExcel(requestFilters);
    } catch (downloadError) {
      handleError(downloadError);
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleBackup() {
    setIsBackingUp(true);
    setError("");
    try {
      await downloadBackup(requestFilters);
    } catch (backupError) {
      handleError(backupError);
    } finally {
      setIsBackingUp(false);
    }
  }

  // The Technology filter shows today's technologies (Settings page) plus the built-in ones
  useEffect(function () {
    getFormTechnologies()
      .then(setFormTechnologies)
      .catch(function () {
        setFormTechnologies([]);
      });
  }, []);

  function updateFilter(name, value) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }
    if (name !== "page") {
      next.delete("page"); // a new filter starts again from page 1
    }
    setSearchParams(next);
  }

  // Choosing a period. "Custom dates" starts with the last 7 days, which the admin can then change.
  function changePeriod(value) {
    const next = new URLSearchParams(searchParams);
    next.delete("page");
    next.delete("from");
    next.delete("to");
    if (value) {
      next.set("period", value);
    } else {
      next.delete("period");
    }
    if (value === "custom") {
      const lastWeek = getDateRange("week");
      next.set("from", lastWeek.from);
      next.set("to", lastWeek.to);
    }
    setSearchParams(next);
  }

  function clearFilters() {
    setSearchText("");
    setSearchParams(new URLSearchParams());
  }

  function handleError(loadError) {
    if (loadError instanceof SessionExpiredError) {
      navigate("/admin/login", { replace: true, state: { from: "/admin" } });
      return;
    }
    setError(loadError.message);
  }

  // Wait until the admin stops typing for a moment, then search
  useEffect(
    function () {
      const timer = setTimeout(function () {
        if (searchText.trim() !== filters.search) {
          updateFilter("search", searchText.trim());
        }
      }, 400);
      return function () {
        clearTimeout(timer);
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchText],
  );

  // Load the numbers at the top (they follow the date filter)
  const dateKey = dateRange.from + "|" + dateRange.to;
  useEffect(
    function () {
      getStats({ from: dateRange.from, to: dateRange.to })
        .then(setStats)
        .catch(handleError);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateKey],
  );

  // Load the list whenever a filter changes
  const queryKey = searchParams.toString();
  useEffect(
    function () {
      let cancelled = false;
      setIsLoading(true);
      setError("");
      listApplications(requestFilters)
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
    [queryKey],
  );

  const technologyOptions = [];
  for (let i = 0; i < formTechnologies.length; i++) {
    technologyOptions.push({
      value: formTechnologies[i],
      label: formTechnologies[i],
    });
  }
  for (let i = 0; i < TECHNOLOGIES.length; i++) {
    if (!formTechnologies.includes(TECHNOLOGIES[i].value)) {
      technologyOptions.push({
        value: TECHNOLOGIES[i].value,
        label:
          TECHNOLOGIES[i].label + (formTechnologies.length > 0 ? " (old)" : ""),
      });
    }
  }
  const hasFilters =
    filters.status ||
    filters.technology ||
    filters.location ||
    filters.mode ||
    filters.internshipType ||
    filters.visited ||
    filters.joined ||
    filters.applicant ||
    filters.search ||
    filters.period;
  const rangeText = describeRange(dateRange);
  const todayText = toDateText(new Date());
  const items = data ? data.items : [];
  const pagination = data ? data.pagination : null;

  return (
    <AdminLayout>
      {/* ---------- Heading + numbers ---------- */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Applications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {stats ? stats.today + " new today" : "Loading…"}
            {stats && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={function () {
                    updateFilter("visited", "today");
                  }}
                  className="font-semibold text-sky-800 hover:underline"
                  title="Show the students who visited the office today"
                >
                  {stats.visitedToday} visited today
                </button>
                {" · "}
                <button
                  type="button"
                  onClick={function () {
                    updateFilter("joined", "today");
                  }}
                  className="font-semibold text-emerald-700 hover:underline"
                  title="Show the students who joined today"
                >
                  {stats.joinedToday} joined today
                </button>
              </>
            )}
            {rangeText && (
              <>
                {" · "}
                <span className="font-semibold text-brand-800">
                  Showing {rangeText}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading || (pagination && pagination.total === 0)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-600 hover:text-emerald-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20 disabled:cursor-not-allowed disabled:opacity-50"
            title="Downloads the applications that match the current filters"
          >
            <svg
              className="h-4 w-4 text-emerald-600"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.69L6.53 8.72a.75.75 0 00-1.06 1.06l4 4a.75.75 0 001.06 0l4-4a.75.75 0 10-1.06-1.06l-2.72 2.72V2.75z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
            {isDownloading
              ? "Preparing…"
              : filters.joined === "today"
                ? "Download joined today (Excel)"
                : filters.visited === "today"
                ? "Download today's visitors (Excel)"
                : hasFilters
                  ? "Download filtered (Excel)"
                  : "Download all (Excel)"}
          </button>
          {isSuperadmin && (
            <button
              type="button"
              onClick={handleBackup}
              disabled={isBackingUp || (pagination && pagination.total === 0)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-600 hover:text-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20 disabled:cursor-not-allowed disabled:opacity-50"
              title="ZIP file: the Excel sheet + every document, one folder per application (same filters)"
            >
              <svg
                className="h-4 w-4 text-brand-600"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M2 3a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1V3z" />
                <path
                  fillRule="evenodd"
                  d="M3 7.5h14V16a2 2 0 01-2 2H5a2 2 0 01-2-2V7.5zm5 3a.75.75 0 000 1.5h4a.75.75 0 000-1.5H8z"
                  clipRule="evenodd"
                />
              </svg>
              {isBackingUp ? "Preparing ZIP…" : "Backup with documents (ZIP)"}
            </button>
          )}
        </div>
      </div>
      {trashedMessage && (
        <Alert type="success" className="mt-4">
          {trashedMessage}
        </Alert>
      )}

      {/* Status tabs with counts */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATUS_TABS.map(function (tab) {
          const isActive = filters.status === tab.value;
          return (
            <button
              key={tab.label}
              type="button"
              onClick={function () {
                updateFilter("status", tab.value);
              }}
              aria-pressed={isActive}
              className={
                "rounded-xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20 " +
                (isActive
                  ? "border-brand-700 bg-brand-700 text-white"
                  : "border-slate-200 bg-white hover:border-brand-300")
              }
            >
              <span
                className={
                  "block text-sm font-medium " +
                  (isActive ? "text-brand-100" : "text-slate-500")
                }
              >
                {tab.label}
              </span>
              <span
                className={
                  "mt-0.5 block text-2xl font-extrabold tabular-nums " +
                  (isActive ? "text-white" : "text-slate-900")
                }
              >
                {stats ? stats[tab.statKey] : "–"}
              </span>
            </button>
          );
        })}
      </div>

      {/* ---------- Search + filters ---------- */}
      <div className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="relative block sm:col-span-2">
          <span className="sr-only">Search</span>
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.39l3.08 3.08a.75.75 0 11-1.06 1.06l-3.08-3.08A7 7 0 012 9z"
              clipRule="evenodd"
            />
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
        <FilterSelect
          label="Technology"
          value={filters.technology}
          options={technologyOptions}
          onChange={function (value) {
            updateFilter("technology", value);
          }}
        />
        <FilterSelect
          label="Location"
          value={filters.location}
          options={LOCATIONS}
          onChange={function (value) {
            updateFilter("location", value);
          }}
        />
        <FilterSelect
          label="Mode"
          value={filters.mode}
          options={INTERNSHIP_MODES}
          onChange={function (value) {
            updateFilter("mode", value);
          }}
        />
        <FilterSelect
          label="Type"
          value={filters.internshipType}
          options={TYPE_OPTIONS}
          onChange={function (value) {
            updateFilter("internshipType", value);
          }}
        />
        <FilterSelect
          label="Visited"
          value={filters.visited}
          options={VISITED_OPTIONS}
          onChange={function (value) {
            updateFilter("visited", value);
          }}
        />
        <FilterSelect
          label="Joined"
          value={filters.joined}
          options={JOINED_OPTIONS}
          onChange={function (value) {
            updateFilter("joined", value);
          }}
        />
        <FilterSelect
          label="Applicant"
          value={filters.applicant}
          options={APPLICANT_OPTIONS}
          onChange={function (value) {
            updateFilter("applicant", value);
          }}
        />
        <FilterSelect
          label="Applied"
          value={filters.period}
          options={DATE_PERIODS}
          onChange={changePeriod}
        />

        {/* From – To, only for "Custom dates" */}
        {filters.period === "custom" && (
          <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3 sm:col-span-2 lg:col-span-5">
            <label className="block min-w-0 flex-1 sm:flex-none">
              <span className="mb-1 block text-[13px] font-semibold text-slate-600">
                From
              </span>
              <input
                type="date"
                value={filters.customFrom}
                max={filters.customTo || todayText}
                onChange={function (event) {
                  updateFilter("from", event.target.value);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15 sm:w-44"
              />
            </label>
            <label className="block min-w-0 flex-1 sm:flex-none">
              <span className="mb-1 block text-[13px] font-semibold text-slate-600">
                To
              </span>
              <input
                type="date"
                value={filters.customTo}
                min={filters.customFrom || undefined}
                max={todayText}
                onChange={function (event) {
                  updateFilter("to", event.target.value);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15 sm:w-44"
              />
            </label>
            <p className="w-full text-[13px] text-slate-500 sm:w-auto sm:pb-2">
              Both dates are included.
            </p>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-accent-100 bg-accent-50 px-4 py-3 text-sm text-accent-600"
        >
          {error}
        </div>
      )}

      {/* ---------- Results ---------- */}
      <div
        className={
          "mt-5 transition-opacity " + (isLoading && data ? "opacity-60" : "")
        }
      >
        {pagination && (
          <p className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            <span>
              {pagination.total === 0
                ? "No applications found"
                : "Showing " +
                  ((pagination.page - 1) * pagination.pageSize + 1) +
                  "–" +
                  Math.min(
                    pagination.page * pagination.pageSize,
                    pagination.total,
                  ) +
                  " of " +
                  pagination.total}
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="font-semibold text-brand-700 hover:underline focus:outline-none focus-visible:underline"
              >
                Clear filters
              </button>
            )}
          </p>
        )}

        {!data && isLoading && (
          <p className="py-16 text-center text-sm text-slate-500">
            Loading applications…
          </p>
        )}

        {data && items.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <p className="text-base font-semibold text-slate-800">
              {hasFilters
                ? "No applications match these filters"
                : "No applications yet"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {hasFilters
                ? "Try another search or clear the filters."
                : "New applications from the website form will appear here."}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
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
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">
                      Duration
                    </th>
                    <th className="px-4 py-3 font-medium">Applied</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map(function (item) {
                    return (
                      <tr
                        key={item.id}
                        onClick={function () {
                          navigate("/admin/applications/" + item.id);
                        }}
                        className="cursor-pointer transition-colors hover:bg-brand-50/50"
                      >
                        <td className="px-4 py-3">
                          <Link
                            to={"/admin/applications/" + item.id}
                            onClick={function (event) {
                              event.stopPropagation();
                            }}
                            className="font-semibold text-slate-900 hover:text-brand-700 focus:outline-none focus-visible:underline"
                          >
                            {item.fullName}
                          </Link>
                          {item.earlierCount > 0 && (
                            <span className="ml-2 align-middle">
                              <ReturningTag earlierCount={item.earlierCount} />
                            </span>
                          )}
                          <span className="mt-0.5 block text-[13px] text-slate-500">
                            {formatPhone(item.contactNumber)} ·{" "}
                            {item.referenceNo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.technologies.join(", ")}
                          {item.internshipType && (
                            <span className="mt-0.5 block text-[13px] text-slate-500">
                              {item.internshipType} internship
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.location} · {item.mode}
                        </td>
                        <td className="hidden px-4 py-3 text-slate-700 lg:table-cell">
                          {item.durations.join(", ")}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-4 py-3">
                          <ProgressSteps visitedAt={item.visitedAt} joinedAt={item.joinedAt} />
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
                  <li key={item.id}>
                    <Link
                      to={"/admin/applications/" + item.id}
                      className="block rounded-xl border border-slate-200 bg-white p-4 transition active:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-slate-900">
                            {item.fullName}
                          </p>
                          <p className="mt-0.5 text-[13px] text-slate-500">
                            {formatPhone(item.contactNumber)}
                          </p>
                          {item.earlierCount > 0 && (
                            <p className="mt-1.5">
                              <ReturningTag earlierCount={item.earlierCount} />
                            </p>
                          )}
                        </div>
                        <div className="shrink-0">
                          <StatusBadge status={item.status} />
                        </div>
                      </div>
                      <p className="mt-3 text-sm font-medium text-slate-800">
                        {item.technologies.join(", ")}
                        {item.internshipType && (
                          <span className="font-normal text-slate-500">
                            {" "}
                            · {item.internshipType}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[13px] text-slate-500">
                        {item.location} · {item.mode} ·{" "}
                        {item.durations.join(", ")}
                      </p>
                      <p className="mt-2.5">
                        <ProgressSteps visitedAt={item.visitedAt} joinedAt={item.joinedAt} />
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        {item.referenceNo} · Applied{" "}
                        {formatDate(item.createdAt)}
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
          <nav
            className="mt-5 flex items-center justify-between gap-3"
            aria-label="Pages"
          >
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={function () {
                updateFilter("page", String(pagination.page - 1));
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
                updateFilter("page", String(pagination.page + 1));
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
