import { useState } from 'react';

// Company logo: frontend/public/logo.png (same logo as maxgentechnologies.com)
// If the image ever fails to load, a text version of the logo is shown instead.
const LOGO_SRC = '/logo.png';

function Logo({ className }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (imageFailed) {
    return (
      <span className={'inline-flex items-baseline gap-1.5 ' + (className || '')} aria-label="Maxgen Technologies">
        <span className="text-xl font-extrabold tracking-[0.12em] text-accent-500">MAXGEN</span>
        <span className="hidden text-sm font-semibold text-brand-700 sm:inline">
          Technologies
        </span>
      </span>
    );
  }

  return (
    <img
      src={LOGO_SRC}
      alt="Maxgen Technologies"
      className={className || 'h-11 w-auto shrink-0 sm:h-[58px]'}
      onError={function () {
        setImageFailed(true);
      }}
    />
  );
}

export default Logo;
