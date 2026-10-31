import Logo from '../../components/layout/Logo';

// Page frame for the screens used before signing in: sign in, forgot password, reset password
function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="h-1.5 bg-brand-700" />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center">
            <Logo className="h-14 w-auto" />
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-brand-800">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export default AuthLayout;
