import { createElement, lazy } from 'react';

const Home = lazy(() => import('../../pages/Home'));
const Login = lazy(() => import('../../pages/Auth/Login'));
const Signup = lazy(() => import('../../pages/Auth/Signup'));

export const landingRoutes = [
  {
    element: createElement(Home),
    path: '/',
    public: true,
    title: 'Blue Horizon Strategic Foresight',
  },
  {
    element: createElement(Login),
    path: '/login',
    public: true,
    title: 'Log In',
  },
  {
    element: createElement(Signup),
    path: '/signup',
    public: true,
    title: 'Create Account',
  },
];
