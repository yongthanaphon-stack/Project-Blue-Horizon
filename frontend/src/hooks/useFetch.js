import { useCallback, useEffect, useRef, useState } from 'react';

function getResponseData(response) {
  return response?.data ?? response;
}

function getErrorMessage(error) {
  return error?.response?.data?.message || error?.message || 'Unable to load data.';
}

export function useFetch(fetcher, options = {}) {
  const {
    enabled = true,
    immediate = true,
    onError,
    onSuccess,
    params,
  } = options;

  const isMountedRef = useRef(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async (requestParams = params) => {
    if (!enabled) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetcher(requestParams);
      const nextData = getResponseData(response);

      if (isMountedRef.current) {
        setData(nextData);
        onSuccess?.(nextData);
      }

      return nextData;
    } catch (requestError) {
      const message = getErrorMessage(requestError);

      if (isMountedRef.current) {
        setError(message);
        onError?.(message, requestError);
      }

      return null;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [enabled, fetcher, onError, onSuccess, params]);

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

  return {
    data,
    error,
    loading,
    refetch: execute,
    setData,
  };
}
