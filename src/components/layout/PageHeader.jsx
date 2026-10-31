import Logo from './Logo';
import { TECHNOLOGIES } from '../../constants/formOptions';

const WEBSITE_URL = 'https://www.maxgentechnologies.com/';
const CURRENT_YEAR = new Date().getFullYear();

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6">
        <a
          href={WEBSITE_URL}
          className="flex min-w-0 items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 sm:gap-4"
        >
          <Logo />
          <span className="h-8 w-px shrink-0 bg-slate-200 sm:h-10" aria-hidden="true" />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-base font-extrabold tracking-tight text-brand-700 sm:text-xl">
              Maxgen <span className="text-accent-500">Technologies</span>
            </span>
            <span className="mt-0.5 block truncate text-xs font-medium text-slate-500 sm:text-[13px]">
              Internship applications
            </span>
          </span>
        </a>
        <div className="hidden shrink-0 items-center gap-2 text-xs font-medium text-slate-500 md:flex">
          <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
              clipRule="evenodd"
            />
          </svg>
          <span>Secure application</span>
        </div>
      </div>
    </header>
  );
}

/**
 * The 14 technologies written large and slanted behind the hero, like the strokes of the Maxgen "M".
 * The ones the student picks in the form light up in red.
 */
function TechnologyWall({ selectedTechnologies }) {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 w-full overflow-hidden opacity-60 [mask-image:linear-gradient(to_right,transparent_0%,black_60%)] lg:w-[46%] lg:opacity-100 lg:[mask-image:linear-gradient(to_right,transparent_0%,black_22%)]"
      aria-hidden="true"
    >
      <ul className="absolute -right-24 -top-10 flex w-[680px] -rotate-[14deg] flex-wrap content-start gap-x-6 gap-y-1 sm:-right-10 lg:-right-16 lg:top-4">
        {TECHNOLOGIES.map(function (technology, index) {
          const isSelected = selectedTechnologies.includes(technology.value);
          let className = 'whitespace-nowrap text-[40px] font-extrabold leading-[1.15] tracking-tight transition-colors duration-500 ';

          if (isSelected) {
            className = className + 'text-accent-500 opacity-100';
          } else if (index % 3 === 1) {
            // Every third name is drawn as an outline, the rest as faint solid text
            className = className + 'text-transparent opacity-60 [-webkit-text-stroke:1px_rgba(255,255,255,0.35)]';
          } else {
            className = className + 'text-white/[0.09]';
          }

          return (
            <li key={technology.value} className={className}>
              {technology.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Hero({ selectedTechnologies }) {
  // Kept short on purpose, so the form starts high on the screen (most students use a phone)
  return (
    <div className="relative overflow-hidden bg-brand-700">
      <TechnologyWall selectedTechnologies={selectedTechnologies} />

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-5 sm:px-6 sm:pb-24 sm:pt-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/15 sm:text-[13px]">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
          Applications open for {CURRENT_YEAR}
        </p>

        <h1 className="mt-3 max-w-xl text-2xl sm:max-w-3xl font-extrabold leading-tight tracking-tight text-white sm:text-[34px]">
          Learn by building real software at Maxgen.
        </h1>
        <p className="mt-2 max-w-lg text-sm sm:max-w-2xl leading-relaxed text-brand-100 sm:text-[15px]">
          14 technologies · Online, offline or hybrid · Ahmedabad, Pune &amp; Mumbai.
          <span className="hidden sm:inline"> Apply below in about 5 minutes.</span>
        </p>
      </div>
    </div>
  );
}

export function PageFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-center text-[13px] text-slate-500 sm:flex-row sm:px-6 sm:text-left">
        <p>© {CURRENT_YEAR} Maxgen Technologies Pvt. Ltd.</p>
        <a href={WEBSITE_URL} className="font-medium text-brand-700 underline-offset-4 hover:underline">
          maxgentechnologies.com
        </a>
      </div>
    </footer>
  );
}
