import { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AlertToast from '../components/feedback/AlertToast';
import ThemeProvider from '../components/theme/ThemeProvider';
import { AuthProvider } from '../contexts/AuthProvider';
import Layout from '../layouts/AppLayout';
import { useAuthContext } from '../hooks/useAuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSessionValidation } from '../hooks/useSessionValidation';
import { authenticatedRoutes, publicRoutePaths, publicRoutes } from './routes/routeRegistry';
import { renderRoutes } from './routes/renderRoutes';

const DEFAULT_PRIVATE_PATH = '/signals';

function AppLoadingScreen() {
  return <div className="app-loading-screen">Loading workspace...</div>;
}

/* Wrapper that conditionally applies the sidebar Layout */
function AppRoutes() {
  const location = useLocation();
  const { hasValidatedSession, isAuthenticated } = useAuthContext();
  const isPublicPage = publicRoutePaths.includes(location.pathname);
  useSessionValidation();
  usePageTitle();

  if (isPublicPage) {
    return (
      <Suspense fallback={<AppLoadingScreen />}>
        <Routes>
          {renderRoutes(publicRoutes)}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasValidatedSession) {
    return <AppLoadingScreen />;
  }

  return (
    <Layout>
      <Suspense fallback={<AppLoadingScreen />}>
        <Routes>
          {renderRoutes(authenticatedRoutes)}
          <Route path="*" element={<Navigate to={DEFAULT_PRIVATE_PATH} replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <AlertToast />
          <AppRoutes />
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}
