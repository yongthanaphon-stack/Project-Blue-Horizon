import { createElement, lazy } from 'react';

const EnterpriseModulePage = lazy(() => import('../../pages/Placeholder/EnterpriseModulePage'));

export const evaluationRoutes = [
  {
    element: createElement(EnterpriseModulePage, {
      description: 'Evaluate scenario quality, signal confidence, workshop outcomes, and strategic decision readiness.',
      eyebrow: 'Strategic Evaluation',
      metrics: [
        { label: 'Evaluations', value: '24' },
        { label: 'Pending Reviews', value: '5' },
        { label: 'Confidence Score', value: '89%' },
      ],
      title: 'Evaluation',
    }),
    path: '/evaluation',
    protected: true,
    title: 'Evaluation',
  },
];
