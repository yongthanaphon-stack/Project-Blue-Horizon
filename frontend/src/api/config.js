const DEFAULT_API_ORIGIN = 'http://localhost:3001';

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

export const API_ORIGIN = trimTrailingSlash(
  import.meta.env.VITE_API_ORIGIN || DEFAULT_API_ORIGIN
);

export const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || `${API_ORIGIN}/api`
);

export const NOTIFICATION_SOCKET_URL = trimTrailingSlash(
  import.meta.env.VITE_NOTIFICATION_SOCKET_URL || `${API_ORIGIN}/notifications`
);
