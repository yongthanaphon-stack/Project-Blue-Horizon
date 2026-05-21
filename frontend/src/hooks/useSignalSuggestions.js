import { useEffect, useState } from 'react';
import { publicSignalsApi } from '../api/api';

export function useSignalSuggestions(query, enabled = true) {
  const [state, setState] = useState({
    loading: false,
    query: '',
    suggestions: [],
  });

  useEffect(() => {
    let isMounted = true;
    const term = query.trim();

    const timer = window.setTimeout(async () => {
      if (!enabled || term.length < 2) {
        if (isMounted) {
          setState({ loading: false, query: term, suggestions: [] });
        }
        return;
      }

      if (isMounted) {
        setState(prev => ({ ...prev, loading: true, query: term }));
      }

      try {
        const response = await publicSignalsApi.getSuggestions({ search: term, limit: 5 });
        if (isMounted) {
          setState({
            loading: false,
            query: term,
            suggestions: response.data || [],
          });
        }
      } catch (error) {
        console.error('Failed to load signal suggestions', error);
        if (isMounted) {
          setState({ loading: false, query: term, suggestions: [] });
        }
      }
    }, 180);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [enabled, query]);

  const term = query.trim();
  if (state.query !== term) {
    return { loading: term.length >= 2 && enabled, suggestions: [] };
  }

  return {
    loading: state.loading,
    suggestions: state.suggestions,
  };
}
