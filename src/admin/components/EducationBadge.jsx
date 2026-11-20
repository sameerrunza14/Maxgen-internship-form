// "Pursuing" (still studying) or "Passout" (finished), shown like the status badge
const EDUCATION_STYLES = {
  pursuing: { label: 'Pursuing', className: 'bg-sky-50 text-sky-800 ring-sky-200', dot: 'bg-sky-500' },
  passout: { label: 'Passout', className: 'bg-violet-50 text-violet-800 ring-violet-200', dot: 'bg-violet-500' },
};

function EducationBadge({ status, large }) {
  const style = EDUCATION_STYLES[status] || EDUCATION_STYLES.pursuing;
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 ' +
        style.className +
        (large ? ' px-3 py-1 text-sm' : ' px-2.5 py-0.5 text-xs')
      }
    >
      <span className={'h-1.5 w-1.5 rounded-full ' + style.dot} aria-hidden="true" />
      {style.label}
    </span>
  );
}

export default EducationBadge;
