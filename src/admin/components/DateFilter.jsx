import { DATE_PERIODS, getDateRange, toDateText } from '../dateRanges';

const fieldClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15';

/**
 * Period dropdown ("All time", "Today", "Last 7 days" …) plus From / To for "Custom dates".
 *   value    = { period, from, to }   (from / to only matter for 'custom')
 *   onChange = function ({ period, from, to })
 * Use getDateRange(value.period, value.from, value.to) to get the real dates.
 */
function DateFilter({ value, onChange, allLabel }) {
  const todayText = toDateText(new Date());

  function changePeriod(period) {
    if (period === 'custom') {
      const lastWeek = getDateRange('week');
      onChange({ period: period, from: lastWeek.from, to: lastWeek.to });
    } else {
      onChange({ period: period, from: '', to: '' });
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="block">
        <span className="sr-only">Date</span>
        <select
          value={value.period}
          onChange={function (event) {
            changePeriod(event.target.value);
          }}
          className={fieldClass + ' cursor-pointer pr-8' + (value.period ? ' border-brand-600 font-medium text-brand-800' : '')}
        >
          <option value="">{allLabel || 'All time'}</option>
          {DATE_PERIODS.map(function (option) {
            return (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            );
          })}
        </select>
      </label>
      {value.period === 'custom' && (
        <>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">From</span>
            <input
              type="date"
              value={value.from}
              max={value.to || todayText}
              onChange={function (event) {
                onChange({ ...value, from: event.target.value });
              }}
              className={fieldClass + ' py-2'}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">To</span>
            <input
              type="date"
              value={value.to}
              min={value.from || undefined}
              max={todayText}
              onChange={function (event) {
                onChange({ ...value, to: event.target.value });
              }}
              className={fieldClass + ' py-2'}
            />
          </label>
        </>
      )}
    </div>
  );
}

export default DateFilter;
