import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useRole } from '../../hooks/useRole';

function passesRouteMiddleware(middleware, context) {
  if (!middleware || middleware.length === 0) return true;

  return middleware.every((checkAccess) => checkAccess(context));
}

export default function ProtectedRoute({
  allowedRoles = [],
  children,
  fallbackPath = '/signals',
  middleware = [],
}) {
  const auth = useAuth();
  const { hasAnyRole, role } = useRole();

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!auth.hasValidatedSession) {
    return <div className="app-loading-screen">Loading workspace...</div>;
  }

  const canUseRouteRole = hasAnyRole(allowedRoles);
  const canPassMiddleware = passesRouteMiddleware(middleware, {
    ...auth,
    role,
  });

  if (!canUseRouteRole || !canPassMiddleware) {
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
}
