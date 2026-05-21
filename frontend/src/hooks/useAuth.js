import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../app/store/slices/authSlice';
import { getRoleLabel, getWorkspacePathForRole, isAdminRole } from '../utils/roles';

export function useAuth() {
  const dispatch = useDispatch();
  const auth = useSelector(state => state.auth);
  const user = auth.user;
  const role = user?.role;

  const logoutUser = useCallback(() => {
    dispatch(logout());
  }, [dispatch]);

  return useMemo(() => ({
    ...auth,
    user,
    role,
    roleLabel: getRoleLabel(role),
    canViewAdmin: isAdminRole(role),
    workspacePath: getWorkspacePathForRole(role),
    logoutUser,
  }), [auth, logoutUser, role, user]);
}
