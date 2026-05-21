import { createElement, lazy } from 'react';
import { ADMIN_ROLES } from '../../utils/roles';
import { requireAdmin } from './routeMiddleware';

const Dashboard = lazy(() => import('../../pages/Admin/Dashboard'));
const UserManagement = lazy(() => import('../../pages/Admin/UserManagement'));

export const adminRoutes = [
  {
    element: createElement(Dashboard),
    fallbackPath: '/signals',
    middleware: [requireAdmin],
    path: '/dashboard',
    protected: true,
    roles: ADMIN_ROLES,
    title: 'Administration Dashboard',
  },
  {
    element: createElement(UserManagement),
    fallbackPath: '/signals',
    middleware: [requireAdmin],
    path: '/users',
    protected: true,
    roles: ADMIN_ROLES,
    title: 'User Management',
  },
];
