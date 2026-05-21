export const ADMIN_ROLES = ['ADMIN', 'ADMIN_SYSTEM'];
export const ANALYST_ROLES = ['ANALYST', 'LEAD_ANALYST'];
export const AUTHENTICATED_ROLES = [...ANALYST_ROLES, ...ADMIN_ROLES];

const ROLE_LABELS = {
  ADMIN: 'Administrator',
  ADMIN_SYSTEM: 'Administrator',
  LEAD_ANALYST: 'Lead Analyst',
  ANALYST: 'Analyst',
};

export function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

export function getRoleLabel(role) {
  return ROLE_LABELS[role] || 'Analyst';
}

export function getWorkspacePathForRole(role) {
  return isAdminRole(role) ? '/dashboard' : '/signals';
}
