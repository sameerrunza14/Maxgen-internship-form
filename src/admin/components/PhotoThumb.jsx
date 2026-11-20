import { useEffect, useState } from 'react';

/**
 * A small photo (note photo or payment receipt). The file needs the admin sign-in, so it is loaded
 * with load() (returns a Blob) instead of a plain <img src>. A click opens the full photo in a new tab.
 */
function PhotoThumb({ load, label, size }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const boxSize = size || 'h-16 w-16';

  useEffect(
    function () {
      let objectUrl = '';
      let cancelled = false;
      load()
        .then(function (blob) {
          if (cancelled) {
            return;
          }
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        })
        .catch(function () {
          if (!cancelled) {
            setFailed(true);
          }
        });
      return function () {
        cancelled = true;
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };
    },
    // load() is a new function on every render, so only the label (one per photo) decides when to reload
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [label]
  );

  if (failed) {
    return (
      <span className={boxSize + ' flex items-center justify-center rounded-lg bg-slate-100 text-center text-[10px] text-slate-400 ring-1 ring-slate-200'}>
        Not found
      </span>
    );
  }
  if (!url) {
    return <span className={boxSize + ' block animate-pulse rounded-lg bg-slate-200'} aria-label="Loading photo" />;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" title={'Open ' + label} className="block shrink-0">
      <img src={url} alt={label} className={boxSize + ' rounded-lg object-cover ring-1 ring-slate-200 transition hover:ring-brand-600'} />
    </a>
  );
}

export default PhotoThumb;
