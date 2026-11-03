import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ApplicationPage from './components/ApplicationPage.jsx';
import { RequireAdmin } from './admin/AdminAuth.jsx';
import { RequireSuperadmin } from './admin/components/AdminUi.jsx';

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

// Superadmin pages
const EditApplicationPage = lazy(function () {
  return import('./admin/pages/EditApplicationPage.jsx');
});
const UsersPage = lazy(function () {
  return import('./admin/pages/UsersPage.jsx');
});
const SettingsPage = lazy(function () {
  return import('./admin/pages/SettingsPage.jsx');
});
const ReportsPage = lazy(function () {
  return import('./admin/pages/ReportsPage.jsx');
});
const ActivityPage = lazy(function () {
  return import('./admin/pages/ActivityPage.jsx');
});
const TrashPage = lazy(function () {
  return import('./admin/pages/TrashPage.jsx');
});

// Every superadmin page needs a sign-in AND the superadmin role
function SuperadminPage({ children }) {
  return (
    <RequireAdmin>
      <RequireSuperadmin>{children}</RequireSuperadmin>
    </RequireAdmin>
  );
}

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

        <Route path="/admin/applications/:id/edit" element={<RequireAdmin><EditApplicationPage /></RequireAdmin>} />
        <Route path="/admin/users" element={<SuperadminPage><UsersPage /></SuperadminPage>} />
        <Route path="/admin/settings" element={<SuperadminPage><SettingsPage /></SuperadminPage>} />
        <Route path="/admin/reports" element={<SuperadminPage><ReportsPage /></SuperadminPage>} />
        <Route path="/admin/activity" element={<SuperadminPage><ActivityPage /></SuperadminPage>} />
        <Route path="/admin/trash" element={<RequireAdmin><TrashPage /></RequireAdmin>} />

        {/* Any other address goes to the form */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
