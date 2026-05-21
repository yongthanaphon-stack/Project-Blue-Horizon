import { createElement, lazy } from 'react';

const Profile = lazy(() => import('../../pages/Profile'));
const Settings = lazy(() => import('../../pages/Settings'));

export const meRoutes = [
  {
    element: createElement(Profile),
    path: '/profile',
    protected: true,
    title: 'My Profile',
  },
  {
    element: createElement(Settings),
    path: '/settings',
    protected: true,
    title: 'Settings',
  },
];
