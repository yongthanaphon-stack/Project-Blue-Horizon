import { createElement, lazy } from 'react';

const EnterpriseModulePage = lazy(() => import('../../pages/Placeholder/EnterpriseModulePage'));

export const publicationsRoutes = [
  {
    element: createElement(EnterpriseModulePage, {
      description: 'Manage research publications, scenario briefs, policy papers, and executive-ready foresight outputs.',
      eyebrow: 'Research Publication Management',
      metrics: [
        { label: 'Draft Reports', value: '12' },
        { label: 'Published Briefs', value: '8' },
        { label: 'Review Queue', value: '4' },
      ],
      title: 'Publications',
    }),
    path: '/publications',
    protected: true,
    title: 'Publications',
  },
];
