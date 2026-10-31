import { Link, useNavigate } from 'react-router-dom';
import Logo from '../../components/layout/Logo';
import { useAdmin } from '../AdminAuth';

function AdminLayout({ children }) {
  const { admin, signOut } = useAdmin();
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

          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-right text-sm leading-tight sm:block">
              <span className="block font-semibold text-slate-800">{admin.name}</span>
              <span className="block text-xs text-slate-500">{admin.email}</span>
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}

export default AdminLayout;
