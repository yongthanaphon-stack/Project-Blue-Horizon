const CACHE_PREFIX = 'blueHorizonCache';
const CACHE_VERSION = 1;

function getStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function buildStorageKey(key) {
  return `${CACHE_PREFIX}:${key}`;
}

export function getCacheItem(key) {
  const storage = getStorage();
  if (!storage || !key) return null;

  try {
    const rawItem = storage.getItem(buildStorageKey(key));
    if (!rawItem) return null;

    const item = JSON.parse(rawItem);
    const isExpired = item.expiresAt && Date.now() > item.expiresAt;
    const isWrongVersion = item.version !== CACHE_VERSION;

    if (isExpired || isWrongVersion) {
      storage.removeItem(buildStorageKey(key));
      return null;
    }

    return item.value;
  } catch {
    storage.removeItem(buildStorageKey(key));
    return null;
  }
}

export function setCacheItem(key, value, ttlMs) {
  const storage = getStorage();
  if (!storage || !key) return;

  const item = {
    createdAt: Date.now(),
    expiresAt: ttlMs ? Date.now() + ttlMs : null,
    value,
    version: CACHE_VERSION,
  };

  storage.setItem(buildStorageKey(key), JSON.stringify(item));
}

export function removeCacheItem(key) {
  getStorage()?.removeItem(buildStorageKey(key));
}

export function clearExpiredCacheItems() {
  const storage = getStorage();
  if (!storage) return;

  Object.keys(storage)
    .filter((key) => key.startsWith(`${CACHE_PREFIX}:`))
    .forEach((key) => {
      try {
        const item = JSON.parse(storage.getItem(key));
        if (item.expiresAt && Date.now() > item.expiresAt) {
          storage.removeItem(key);
        }
      } catch {
        storage.removeItem(key);
      }
    });
}
