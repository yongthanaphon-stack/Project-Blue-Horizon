import { createElement } from 'react';
import { Route } from 'react-router-dom';
import ProtectedRoute from '../../components/routing/ProtectedRoute';

function getRouteElement(route) {
  if (!route.protected) return route.element;

  return createElement(
    ProtectedRoute,
    {
      allowedRoles: route.roles,
      fallbackPath: route.fallbackPath,
      middleware: route.middleware,
    },
    route.element
  );
}

export function renderRoutes(routes) {
  return routes.map((route) =>
    createElement(Route, {
      element: getRouteElement(route),
      key: route.path,
      path: route.path,
    })
  );
}
