import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from './States';
import { ROLE_HOME } from '../constants';

// Guards a group of routes by role. The backend enforces the same rules;
// this only keeps people out of screens they cannot use.
export function ProtectedRoute({ roles }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <PageLoader />;
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <Outlet />;
}

// Sign-in and registration are only for signed-out visitors.
export function GuestRoute() {
  const { user, status } = useAuth();
  if (status === 'loading') return <PageLoader />;
  if (status === 'authenticated') return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <Outlet />;
}

export function HomeRedirect() {
  const { user, status } = useAuth();
  if (status === 'loading') return <PageLoader />;
  return <Navigate to={status === 'authenticated' ? ROLE_HOME[user.role] : '/login'} replace />;
}
