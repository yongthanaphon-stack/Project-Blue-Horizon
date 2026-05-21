import { isAdminRole } from '../../utils/roles';

export function requireAdmin(context) {
  return isAdminRole(context.role);
}

export function requireAuthenticated(context) {
  return Boolean(context.isAuthenticated);
}
