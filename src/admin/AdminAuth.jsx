import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getToken, getCurrentAdmin, clearToken, markActive, isIdleTooLong, IDLE_MINUTES } from './adminApi';

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
  // Signed out after a long break (e.g. the laptop was left open): ask for the password again
  const [status, setStatus] = useState(function () {
    if (getToken() && isIdleTooLong()) {
      clearToken();
      return 'timed-out';
    }
    return getToken() ? 'checking' : 'signed-out';
  });

  // Every click, key press, scroll or touch counts as "active". Every 30 seconds we check the break.
  useEffect(
    function () {
      if (status !== 'signed-in') {
        return;
      }
      let lastSaved = 0;
      function onActivity() {
        // save at most once every 10 seconds
        if (Date.now() - lastSaved > 10000) {
          lastSaved = Date.now();
          markActive();
        }
      }
      const events = ['click', 'keydown', 'scroll', 'touchstart', 'mousemove'];
      for (let i = 0; i < events.length; i++) {
        window.addEventListener(events[i], onActivity, { passive: true });
      }
      markActive();
      const timer = window.setInterval(function () {
        if (isIdleTooLong()) {
          clearToken();
          setAdmin(null);
          setStatus('timed-out');
        }
      }, 30000);
      return function () {
        for (let i = 0; i < events.length; i++) {
          window.removeEventListener(events[i], onActivity);
        }
        window.clearInterval(timer);
      };
    },
    [status]
  );

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

  if (status === 'timed-out') {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{
          from: location.pathname + location.search,
          message: 'You were signed out after ' + IDLE_MINUTES + ' minutes of no use. Please sign in again.',
        }}
      />
    );
  }

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Checking your sign-in…
      </div>
    );
  }

  // isSuperadmin: shows the extra pages (Users, Settings, Reports, Activity, Trash) and buttons (edit, delete)
  const value = { admin: admin, isSuperadmin: admin.role === 'superadmin', signOut: signOut };
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
