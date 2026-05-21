import { useEffect } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { allAppRoutes } from '../app/routes/routeRegistry';

const APP_NAME = 'Blue Horizon';

function formatPageTitle(title) {
  if (!title) return APP_NAME;
  if (title.includes(APP_NAME)) return title;
  return `${title} | ${APP_NAME}`;
}

export function usePageTitle(defaultTitle = APP_NAME) {
  const { pathname } = useLocation();

  useEffect(() => {
    const matchedRoute = allAppRoutes.find((route) =>
      matchPath({ path: route.path, end: true }, pathname)
    );

    document.title = formatPageTitle(matchedRoute?.title || defaultTitle);
  }, [defaultTitle, pathname]);
}
