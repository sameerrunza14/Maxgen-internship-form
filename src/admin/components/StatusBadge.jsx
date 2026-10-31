const STATUS_STYLES = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  accepted: { label: 'Accepted', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500' },
  rejected: { label: 'Rejected', className: 'bg-accent-50 text-accent-600 ring-accent-100', dot: 'bg-accent-500' },
};

function StatusBadge({ status, large }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ' +
        style.className +
        (large ? ' px-3 py-1 text-sm' : ' px-2.5 py-0.5 text-xs')
      }
    >
      <span className={'h-1.5 w-1.5 rounded-full ' + style.dot} aria-hidden="true" />
      {style.label}
    </span>
  );
}

export default StatusBadge;
