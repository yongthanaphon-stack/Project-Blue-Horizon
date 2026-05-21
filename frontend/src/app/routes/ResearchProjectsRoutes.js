import { createElement, lazy } from 'react';

const EnterpriseModulePage = lazy(() => import('../../pages/Placeholder/EnterpriseModulePage'));

export const researchProjectsRoutes = [
  {
    element: createElement(EnterpriseModulePage, {
      description: 'Coordinate foresight research programs, evidence gathering, signal pipelines, and strategic intelligence workstreams.',
      eyebrow: 'Foresight Intelligence',
      metrics: [
        { label: 'Active Projects', value: '6' },
        { label: 'Signals Linked', value: '148' },
        { label: 'Analysts Active', value: '9' },
      ],
      title: 'Research Projects',
    }),
    path: '/research-projects',
    protected: true,
    title: 'Research Projects',
  },
];
