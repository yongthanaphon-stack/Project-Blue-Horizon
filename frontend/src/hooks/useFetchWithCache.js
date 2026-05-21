import { useCallback, useEffect, useRef, useState } from 'react';
import { getCacheItem, removeCacheItem, setCacheItem } from '../utils/cacheStorage';

function getResponseData(response) {
  return response?.data ?? response;
}

function getErrorMessage(error) {
  return error?.response?.data?.message || error?.message || 'Unable to load data.';
}

export function useFetchWithCache(cacheKey, fetcher, options = {}) {
  const {
    enabled = true,
    immediate = true,
    params,
    ttlMs = 5 * 60 * 1000,
  } = options;

  const isMountedRef = useRef(false);
  const [data, setData] = useState(() => getCacheItem(cacheKey));
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cacheStatus, setCacheStatus] = useState(data ? 'hit' : 'idle');

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async (requestParams = params, optionsOverride = {}) => {
    if (!enabled) return null;

    const shouldSkipCache = optionsOverride.skipCache === true;
    const cachedData = shouldSkipCache ? null : getCacheItem(cacheKey);

    if (cachedData) {
      setData(cachedData);
      setCacheStatus('hit');
      return cachedData;
    }

    setLoading(true);
    setError(null);
    setCacheStatus('miss');

    try {
      const response = await fetcher(requestParams);
      const nextData = getResponseData(response);
      setCacheItem(cacheKey, nextData, ttlMs);

      if (isMountedRef.current) {
        setData(nextData);
        setCacheStatus('stored');
      }

      return nextData;
    } catch (requestError) {
      const message = getErrorMessage(requestError);

      if (isMountedRef.current) {
        setError(message);
      }

      return null;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [cacheKey, enabled, fetcher, params, ttlMs]);

  useEffect(() => {
    if (!immediate) return undefined;

    let shouldRun = true;
    window.queueMicrotask(() => {
      if (shouldRun) execute();
    });

    return () => {
      shouldRun = false;
    };
  }, [execute, immediate]);

  function clearCache() {
    removeCacheItem(cacheKey);
    setCacheStatus('cleared');
  }

  return {
    cacheStatus,
    clearCache,
    data,
    error,
    loading,
    refetch: execute,
    refresh: (requestParams = params) => execute(requestParams, { skipCache: true }),
    setData,
  };
}
