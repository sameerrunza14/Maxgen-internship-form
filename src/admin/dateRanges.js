// Date filter of the admin panel: "Today", "Last 7 days", "This month", ... or a custom From – To.
// The page address keeps only the choice (?period=week), and the real dates are worked out
// each time, so "Today" is always today.

export const DATE_PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'custom', label: 'Custom dates…' },
];

// Date -> "2026-10-31" (in the admin's own time zone)
export function toDateText(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function daysAgo(count) {
  const date = new Date();
  date.setDate(date.getDate() - count);
  return date;
}

// Returns { from: '2026-10-25', to: '2026-10-31' } for a period. Empty strings = no limit.
export function getDateRange(period, customFrom, customTo) {
  const today = new Date();

  if (period === 'today') {
    return { from: toDateText(today), to: toDateText(today) };
  }
  if (period === 'yesterday') {
    const yesterday = daysAgo(1);
    return { from: toDateText(yesterday), to: toDateText(yesterday) };
  }
  if (period === 'week') {
    // Today and the 6 days before it
    return { from: toDateText(daysAgo(6)), to: toDateText(today) };
  }
  if (period === 'month') {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toDateText(firstDay), to: toDateText(today) };
  }
  if (period === 'lastMonth') {
    const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth(), 0); // day 0 = last day of the month before
    return { from: toDateText(firstDay), to: toDateText(lastDay) };
  }
  if (period === 'custom') {
    return { from: customFrom || '', to: customTo || '' };
  }
  return { from: '', to: '' };
}

// "2026-10-31" -> "31 Oct 2026"
export function formatDateText(text) {
  const parts = text.split('-');
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Short description for the page: "1 Oct 2026 – 31 Oct 2026", "From 1 Oct 2026", ...
export function describeRange(range) {
  if (range.from && range.to) {
    if (range.from === range.to) {
      return formatDateText(range.from);
    }
    return formatDateText(range.from) + ' – ' + formatDateText(range.to);
  }
  if (range.from) {
    return 'From ' + formatDateText(range.from);
  }
  if (range.to) {
    return 'Up to ' + formatDateText(range.to);
  }
  return '';
}
