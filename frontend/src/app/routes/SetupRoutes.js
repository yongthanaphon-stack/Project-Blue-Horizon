import { createElement, lazy } from 'react';
import { ADMIN_ROLES } from '../../utils/roles';
import { requireAdmin } from './routeMiddleware';

const EnterpriseModulePage = lazy(() => import('../../pages/Placeholder/EnterpriseModulePage'));

export const setupRoutes = [
  {
    element: createElement(EnterpriseModulePage, {
      description: 'Configure organization settings, RBAC policies, horizon templates, PESTEL defaults, and workspace governance.',
      eyebrow: 'Administration Setup',
      metrics: [
        { label: 'Roles', value: '4' },
        { label: 'Workflows', value: '7' },
        { label: 'Policy Checks', value: 'On' },
      ],
      title: 'Setup',
    }),
    fallbackPath: '/signals',
    middleware: [requireAdmin],
    path: '/setup',
    protected: true,
    roles: ADMIN_ROLES,
    title: 'Setup',
  },
];
