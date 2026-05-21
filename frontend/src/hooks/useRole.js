import { useAuth } from './useAuth';
import { getRoleLabel, isAdminRole } from '../utils/roles';

export function useRole() {
  const { role, user } = useAuth();

  function hasRole(allowedRole) {
    return role === allowedRole;
  }

  function hasAnyRole(allowedRoles = []) {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    return allowedRoles.includes(role);
  }

  return {
    role,
    user,
    roleLabel: getRoleLabel(role),
    isAdmin: isAdminRole(role),
    hasRole,
    hasAnyRole,
  };
}
