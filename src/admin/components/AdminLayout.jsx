import { Link, NavLink, useNavigate } from 'react-router-dom';
import Logo from '../../components/layout/Logo';
import { useAdmin } from '../AdminAuth';

// The pages in the menu. superadminOnly pages are hidden for HR.
const MENU = [
  { to: '/admin', label: 'Applications', end: true },
  { to: '/admin/reports', label: 'Reports', superadminOnly: true },
  { to: '/admin/users', label: 'Users', superadminOnly: true },
  { to: '/admin/activity', label: 'Activity log', superadminOnly: true },
  { to: '/admin/trash', label: 'Trash' }, // HR can see and restore
  { to: '/admin/settings', label: 'Settings', superadminOnly: true },
];

function AdminLayout({ children }) {
  const { admin, isSuperadmin, signOut } = useAdmin();
  const navigate = useNavigate();

  function handleSignOut() {
    signOut();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/admin" className="flex min-w-0 items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
            <Logo className="h-10 w-auto shrink-0" />
            <span className="h-7 w-px shrink-0 bg-slate-200" aria-hidden="true" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[15px] font-extrabold text-brand-700">Admin panel</span>
              <span className="block truncate text-xs text-slate-500">Internship applications</span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden text-right text-sm leading-tight sm:block">
              <span className="block font-semibold text-slate-800">{admin.name}</span>
              <span className="block text-xs text-slate-500">{isSuperadmin ? 'Superadmin' : 'Admin (HR)'} · {admin.email}</span>
            </span>
            <Link
              to="/admin/password"
              title="Change password"
              aria-label="Change password"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M8 7a5 5 0 113.61 4.81l-1.08 1.08a.75.75 0 01-.53.22H8.75v1.14a.75.75 0 01-.75.75H6.86v1.25a.75.75 0 01-.75.75H3.75A.75.75 0 013 16.25v-2.36c0-.2.08-.39.22-.53l4.97-4.97A5 5 0 018 7zm5-1.5a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20"
            >
              Sign out
            </button>
          </div>
        </div>
        {/* Menu: HR sees Applications + Trash, the superadmin sees everything. Scrolls sideways on a phone. */}
        {(
          <nav className="mx-auto max-w-7xl overflow-x-auto px-2 sm:px-4" aria-label="Admin menu">
            <ul className="flex min-w-max gap-1">
              {MENU.map(function (item) {
                if (item.superadminOnly && !isSuperadmin) {
                  return null;
                }
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={function ({ isActive }) {
                        return (
                          'block border-b-2 px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:bg-brand-50 ' +
                          (isActive ? 'border-brand-700 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-800')
                        );
                      }}
                    >
                      {item.label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}

export default AdminLayout;
