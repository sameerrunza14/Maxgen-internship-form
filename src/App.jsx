import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ApplicationPage from './components/ApplicationPage.jsx';
import { RequireAdmin } from './admin/AdminAuth.jsx';

// Admin pages are loaded only when someone opens /admin,
// so students filling the form do not download the admin code.
const LoginPage = lazy(function () {
  return import('./admin/pages/LoginPage.jsx');
});
const ApplicationsPage = lazy(function () {
  return import('./admin/pages/ApplicationsPage.jsx');
});
const ApplicationDetailPage = lazy(function () {
  return import('./admin/pages/ApplicationDetailPage.jsx');
});
const ChangePasswordPage = lazy(function () {
  return import('./admin/pages/ChangePasswordPage.jsx');
});
const ForgotPasswordPage = lazy(function () {
  return import('./admin/pages/ForgotPasswordPage.jsx');
});
const ResetPasswordPage = lazy(function () {
  return import('./admin/pages/ResetPasswordPage.jsx');
});

function PageLoading() {
  return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>;
}

function App() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        {/* Public: the application form */}
        <Route path="/" element={<ApplicationPage />} />

        {/* Admin panel */}
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/admin/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <ApplicationsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/applications/:id"
          element={
            <RequireAdmin>
              <ApplicationDetailPage />
            </RequireAdmin>
          }
        />

        <Route
          path="/admin/password"
          element={
            <RequireAdmin>
              <ChangePasswordPage />
            </RequireAdmin>
          }
        />

        {/* Any other address goes to the form */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
