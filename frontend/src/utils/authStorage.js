const AUTH_USER_KEY = 'blueHorizonUser';
const AUTH_TOKEN_KEY = 'blueHorizonToken';
const REDIRECT_PATH_KEY = 'redirectPath';

function getStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function getSavedUser() {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const savedUser = storage.getItem(AUTH_USER_KEY);
    return savedUser ? JSON.parse(savedUser) : null;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function getAuthToken() {
  return getStorage()?.getItem(AUTH_TOKEN_KEY) || null;
}

export function saveAuthSession(user, token) {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  storage.setItem(AUTH_TOKEN_KEY, token);
}

export function saveAuthUser(user) {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  const storage = getStorage();
  if (!storage) return;

  storage.removeItem(AUTH_USER_KEY);
  storage.removeItem(AUTH_TOKEN_KEY);
  storage.removeItem(REDIRECT_PATH_KEY);
}

export function clearRedirectPath() {
  getStorage()?.removeItem(REDIRECT_PATH_KEY);
}
