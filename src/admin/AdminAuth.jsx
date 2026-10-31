import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getToken, getCurrentAdmin, clearToken } from './adminApi';

// Shares the signed-in admin with every admin page
const AdminContext = createContext(null);

export function useAdmin() {
  return useContext(AdminContext);
}

/**
 * Wraps the admin pages. If there is no valid sign-in, it sends the user to /admin/login.
 */
export function RequireAdmin({ children }) {
  const location = useLocation();
  const [admin, setAdmin] = useState(null);
  const [status, setStatus] = useState(getToken() ? 'checking' : 'signed-out');

  useEffect(
    function () {
      if (status !== 'checking') {
        return;
      }
      let cancelled = false;
      getCurrentAdmin()
        .then(function (currentAdmin) {
          if (!cancelled) {
            setAdmin(currentAdmin);
            setStatus('signed-in');
          }
        })
        .catch(function () {
          if (!cancelled) {
            clearToken();
            setStatus('signed-out');
          }
        });
      return function () {
        cancelled = true;
      };
    },
    [status]
  );

  function signOut() {
    clearToken();
    setAdmin(null);
    setStatus('signed-out');
  }

  if (status === 'signed-out') {
    // Remember where they wanted to go, so we can return there after sign in
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Checking your sign-in…
      </div>
    );
  }

  return <AdminContext.Provider value={{ admin: admin, signOut: signOut }}>{children}</AdminContext.Provider>;
}
