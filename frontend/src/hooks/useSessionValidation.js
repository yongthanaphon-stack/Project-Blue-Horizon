import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { authApi } from '../api/api';
import { logout, refreshSessionComplete, refreshSessionSuccess } from '../app/store/slices/authSlice';

export function useSessionValidation() {
  const dispatch = useDispatch();
  const token = useSelector(state => state.auth.token);
  const user = useSelector(state => state.auth.user);
  const hasValidatedSession = useSelector(state => state.auth.hasValidatedSession);

  useEffect(() => {
    let isMounted = true;

    async function validateSession() {
      if (hasValidatedSession) return;

      if (!token || !user) {
        dispatch(refreshSessionComplete());
        return;
      }

      try {
        const response = await authApi.me();
        if (isMounted) dispatch(refreshSessionSuccess({ user: response.data, token }));
      } catch {
        if (isMounted) dispatch(logout());
      }
    }

    validateSession();

    return () => {
      isMounted = false;
    };
  }, [dispatch, hasValidatedSession, token, user]);
}
