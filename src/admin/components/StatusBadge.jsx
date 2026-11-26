// The three states HR works with:
//   Under review = still to follow up (new, or "accepted only" but not joined yet)
//   Joined       = done
//   Rejected     = not interested
// ("pending" and "accepted" in the database both show as Under review; joined always shows Joined.)

export function statusKey(status, joinedAt) {
  if (joinedAt) {
    return 'joined';
  }
  if (status === 'rejected') {
    return 'rejected';
  }
  return 'review';
}

const STYLES = {
  review: { label: 'Under review', className: 'bg-amber-50 text-amber-800 ring-1 ring-amber-300' },
  joined: { label: 'Joined', className: 'bg-emerald-600 text-white ring-1 ring-emerald-600' },
  rejected: { label: 'Rejected', className: 'bg-accent-50 text-accent-600 ring-1 ring-accent-200' },
};

function StatusIcon({ kind }) {
  if (kind === 'joined') {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 111.4-1.4l2.8 2.79 6.8-6.8a1 1 0 011.4 0z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (kind === 'rejected') {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M6.3 5.3a1 1 0 00-1.4 1.4L8.6 10l-3.7 3.3a1 1 0 101.4 1.4L10 11.4l3.7 3.3a1 1 0 001.4-1.4L11.4 10l3.7-3.3a1 1 0 00-1.4-1.4L10 8.6 6.3 5.3z" />
      </svg>
    );
  }
  // clock
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-12.5a.75.75 0 00-1.5 0V10c0 .2.08.39.22.53l2.5 2.5a.75.75 0 101.06-1.06l-2.28-2.28V5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function StatusBadge({ status, joinedAt, large }) {
  const kind = statusKey(status, joinedAt);
  const style = STYLES[kind];
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ' +
        style.className +
        (large ? ' px-3 py-1 text-sm' : ' px-2.5 py-1 text-xs')
      }
    >
      <StatusIcon kind={kind} />
      {style.label}
    </span>
  );
}

export default StatusBadge;
