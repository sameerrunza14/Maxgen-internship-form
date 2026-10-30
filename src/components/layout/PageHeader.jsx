import Logo from './Logo';

const WEBSITE_URL = 'https://www.maxgentechnologies.com/';

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
            <span className="mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 sm:text-[11px]">
              Pvt. Ltd.<span className="hidden sm:inline"> · Internship Programme</span>
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

const CURRENT_YEAR = new Date().getFullYear();

const HIGHLIGHTS = ['14 technologies', 'Ahmedabad · Pune · Mumbai', 'Online · Offline · Hybrid'];

export function Hero() {
  return (
    <div className="relative overflow-hidden bg-brand-700">
      {/* Decorative slanted bars, inspired by the Maxgen "M" mark */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -right-10 -top-24 h-[420px] w-24 rotate-[20deg] rounded-full bg-white/[0.05]" />
        <div className="absolute right-24 -top-24 h-[420px] w-24 rotate-[20deg] rounded-full bg-white/[0.07]" />
        <div className="absolute right-56 -top-24 h-[420px] w-24 rotate-[20deg] rounded-full bg-white/[0.04]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pb-28 sm:pt-14">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/85 ring-1 ring-white/15">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
          Internship Programme {CURRENT_YEAR}
        </p>
        <h1 className="mt-3 max-w-2xl text-2xl font-extrabold leading-tight tracking-tight text-white sm:mt-4 sm:text-4xl">
          Internship Application Form
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-brand-100 sm:mt-3 sm:text-[15px]">
          Learn by building real projects with our development team. Fill in your details below — it takes about
          5 minutes.
        </p>
        <ul className="mt-6 hidden flex-wrap gap-2 sm:flex">
          {HIGHLIGHTS.map(function (item) {
            return (
              <li key={item} className="rounded-lg bg-white/[0.08] px-3 py-1.5 text-[13px] font-medium text-white/90 ring-1 ring-white/10">
                {item}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function PageFooter() {
  return (
    <footer className="mx-auto max-w-6xl px-4 pb-10 pt-6 text-center text-xs text-slate-400 sm:px-6">
      © {CURRENT_YEAR} Maxgen Technologies Pvt. Ltd. All rights reserved.
    </footer>
  );
}
