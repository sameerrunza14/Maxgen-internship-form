import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import DateFilter from '../components/DateFilter';
import { Alert, Card, PageTitle, useErrorHandler } from '../components/AdminUi';
import { getReports } from '../adminApi';
import { getDateRange, describeRange } from '../dateRanges';

// Colours for the three statuses (same as the status badges)
const SEGMENTS = [
  { key: 'accepted', label: 'Accepted', className: 'bg-emerald-500' },
  { key: 'pending', label: 'Pending', className: 'bg-amber-400' },
  { key: 'rejected', label: 'Rejected', className: 'bg-accent-500' },
];

// "2026-11" -> "Nov 2026"
function monthLabel(key) {
  const parts = key.split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function SummaryCard({ label, value, note }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-slate-900">{value}</p>
      {note && <p className="text-xs text-slate-400">{note}</p>}
    </div>
  );
}

// One row: name, total, and a bar split into accepted / pending / rejected
function BreakdownRow({ row, max, label }) {
  const width = max > 0 ? (row.total / max) * 100 : 0;
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-medium text-slate-800" title={label || row.name}>
          {label || row.name}
        </span>
        <span className="shrink-0 tabular-nums text-slate-600">
          <span className="font-semibold text-slate-900">{row.total}</span>
          {row.accepted > 0 && <span className="ml-1.5 text-xs text-emerald-700">{row.accepted} accepted</span>}
        </span>
      </div>
      <div className="mt-1.5 h-2.5 w-full rounded-full bg-slate-100">
        <div className="flex h-full overflow-hidden rounded-full" style={{ width: width + '%' }}>
          {SEGMENTS.map(function (segment) {
            const part = row.total > 0 ? ((row[segment.key] || 0) / row.total) * 100 : 0;
            return <div key={segment.key} className={segment.className} style={{ width: part + '%' }} />;
          })}
        </div>
      </div>
    </li>
  );
}

function Breakdown({ title, rows, labelFor, emptyText }) {
  let max = 0;
  for (let i = 0; i < rows.length; i++) {
    max = Math.max(max, rows[i].total);
  }
  return (
    <Card title={title}>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">{emptyText || 'No data'}</p>
      ) : (
        <ul className="space-y-3.5">
          {rows.map(function (row) {
            return <BreakdownRow key={row.name} row={row} max={max} label={labelFor ? labelFor(row.name) : ''} />;
          })}
        </ul>
      )}
    </Card>
  );
}

function ReportsPage() {
  const handleError = useErrorHandler();
  const [dateValue, setDateValue] = useState({ period: '', from: '', to: '' });
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const range = getDateRange(dateValue.period, dateValue.from, dateValue.to);
  const rangeKey = range.from + '|' + range.to;

  useEffect(
    function () {
      let cancelled = false;
      setIsLoading(true);
      setError('');
      getReports({ from: range.from, to: range.to })
        .then(function (result) {
          if (!cancelled) {
            setReport(result);
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
    [rangeKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const rangeText = describeRange(range);
  const summary = report ? report.summary : null;

  return (
    <AdminLayout>
      <PageTitle title="Reports" subtitle={rangeText ? 'Applications received ' + rangeText : 'All applications received (trash not included)'}>
        <DateFilter value={dateValue} onChange={setDateValue} />
      </PageTitle>

      <Alert type="error" className="mt-5">{error}</Alert>
      {!report && isLoading && <p className="py-16 text-center text-sm text-slate-500">Loading reports…</p>}

      {report && (
        <div className={'transition-opacity ' + (isLoading ? 'opacity-60' : '')}>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <SummaryCard label="Applications" value={summary.total} />
            <SummaryCard label="Pending" value={summary.pending} />
            <SummaryCard label="Accepted" value={summary.accepted} />
            <SummaryCard label="Rejected" value={summary.rejected} />
            <SummaryCard
              label="Acceptance rate"
              value={summary.acceptanceRate === null ? '—' : summary.acceptanceRate + '%'}
              note="of decided applications"
            />
            <SummaryCard label="Visited office" value={summary.visited} note="ticked by HR" />
            <SummaryCard
              label="Time to decide"
              value={
                summary.averageReviewHours === null
                  ? '—'
                  : summary.averageReviewHours < 1
                    ? '< 1 h'
                    : summary.averageReviewHours < 48
                      ? Math.round(summary.averageReviewHours) + ' h'
                      : Math.round(summary.averageReviewHours / 24) + ' days'
              }
              note="average"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
            {SEGMENTS.map(function (segment) {
              return (
                <span key={segment.key} className="inline-flex items-center gap-1.5">
                  <span className={'h-2.5 w-2.5 rounded-full ' + segment.className} />
                  {segment.label}
                </span>
              );
            })}
            <span>A student who chose 2 technologies is counted under both.</span>
          </div>

          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <Breakdown
              title="Summer / Winter / Regular"
              rows={report.byInternshipType}
              labelFor={function (name) {
                return name === 'Not specified' ? name : name + ' internship';
              }}
            />
            <Breakdown title="Technologies" rows={report.byTechnology} />
            <Breakdown title="Month by month" rows={report.byMonth} labelFor={monthLabel} />
            <Breakdown title="How students heard about us" rows={report.bySource} />
            <Breakdown title="Durations" rows={report.byDuration} />
            <Breakdown title="Location" rows={report.byLocation} />
            <Breakdown title="Mode" rows={report.byMode} />
            <Breakdown title="Qualification (top 15)" rows={report.byQualification} />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default ReportsPage;
