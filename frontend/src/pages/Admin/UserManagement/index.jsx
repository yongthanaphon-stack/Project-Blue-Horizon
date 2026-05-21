import { createElement, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Download,
  KeyRound,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import UserAvatar from '../../../components/UserAvatar';
import { useAlert } from '../../../hooks/useAlert';
import { useAuth } from '../../../hooks/useAuth';
import { adminUsersApi } from '../../../api/api';
import { formatDate, timeAgo } from '../../../utils/date';
import './UserManagement.css';

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'ANALYST',
};

const ROLE_OPTIONS = [
  {
    value: 'ANALYST',
    label: 'Analyst',
    helper: 'Can scan signals, vote, and join workshop flows.',
    tone: 'analyst',
  },
  {
    value: 'LEAD_ANALYST',
    label: 'Lead Analyst',
    helper: 'Can guide analysis activities and coordinate outputs.',
    tone: 'lead',
  },
  {
    value: 'ADMIN',
    label: 'Administrator',
    helper: 'Can access dashboard, users, and workspace settings.',
    tone: 'admin',
  },
  {
    value: 'ADMIN_SYSTEM',
    label: 'System Administrator',
    helper: 'Full administrative access, including system admin assignment.',
    tone: 'system',
  },
];

const ROLE_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'ADMIN', label: 'Admins' },
  { value: 'LEAD_ANALYST', label: 'Leads' },
  { value: 'ANALYST', label: 'Analysts' },
];

const PROGRESS_SCALE_BASE = 24;
const MIN_VISIBLE_PROGRESS = 4;

function getRoleMeta(role) {
  return ROLE_OPTIONS.find(option => option.value === role) || ROLE_OPTIONS[0];
}

function getActivity(user) {
  const counts = user.counts || {};
  const score = (counts.signals || 0) + (counts.votes || 0) + (counts.workshops || 0);

  if (score >= 12) return { label: 'Highly active', tone: 'high', score };
  if (score > 0) return { label: 'Contributing', tone: 'medium', score };
  return { label: 'New account', tone: 'low', score };
}

function getErrorMessage(error, fallback) {
  const message = error?.response?.data?.message || error?.response?.data?.error;
  if (Array.isArray(message)) return message.join(' ');
  return message || fallback;
}

function getProgressFillWidth(value, total = PROGRESS_SCALE_BASE) {
  if (!value) return 0;
  const scaleBase = Math.max(total, PROGRESS_SCALE_BASE);
  return Math.min(100, Math.max(MIN_VISIBLE_PROGRESS, Math.round((value / scaleBase) * 100)));
}

function StatCard({ icon, label, value, detail, tone }) {
  return (
    <article className={`um-stat-card um-stat-${tone}`}>
      <span className="um-stat-icon">
        {createElement(icon, { size: 20 })}
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function RoleBadge({ role }) {
  const meta = getRoleMeta(role);
  return <span className={`um-role-badge ${meta.tone}`}>{meta.label}</span>;
}

function ActivityMeter({ user }) {
  const activity = getActivity(user);
  const width = getProgressFillWidth(activity.score);

  return (
    <div className="um-activity">
      <div className="um-activity-top">
        <span>{activity.label}</span>
        <strong>{activity.score}</strong>
      </div>
      <div className="um-activity-track">
        <span className={activity.tone} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { showError, showSuccess } = useAlert();
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [mode, setMode] = useState('create');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);

  async function loadUsers({ silent = false } = {}) {
    if (!silent) setLoading(true);

    try {
      const response = await adminUsersApi.getAll();
      setUsers(response.data.users || []);
      setMeta(response.data.meta || null);
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to load users.'));
      setUsers([]);
      setMeta(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function fetchInitialUsers() {
      try {
        const response = await adminUsersApi.getAll();
        if (!isMounted) return;
        setUsers(response.data.users || []);
        setMeta(response.data.meta || null);
      } catch (error) {
        if (!isMounted) return;
        showError(getErrorMessage(error, 'Failed to load users.'));
        setUsers([]);
        setMeta(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchInitialUsers();

    return () => {
      isMounted = false;
    };
  }, [showError]);

  const visibleUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter(user => {
      const matchesSearch =
        !normalizedQuery ||
        (user.name || '').toLowerCase().includes(normalizedQuery) ||
        (user.email || '').toLowerCase().includes(normalizedQuery);

      const matchesRole =
        roleFilter === 'ALL' ||
        user.role === roleFilter ||
        (roleFilter === 'ADMIN' && ['ADMIN', 'ADMIN_SYSTEM'].includes(user.role));

      return matchesSearch && matchesRole;
    });
  }, [query, roleFilter, users]);

  const selectedUser = useMemo(
    () => users.find(user => user.id === selectedUserId) || null,
    [selectedUserId, users],
  );

  const metrics = useMemo(() => {
    const admins = users.filter(user => ['ADMIN', 'ADMIN_SYSTEM'].includes(user.role)).length;
    const leads = users.filter(user => user.role === 'LEAD_ANALYST').length;
    const active = users.filter(user => getActivity(user).score > 0).length;

    return {
      total: meta?.total || users.length,
      admins,
      leads,
      active,
      analysts: users.length - admins - leads,
    };
  }, [meta, users]);

  const availableRoleOptions = useMemo(
    () => ROLE_OPTIONS.filter(option => (
      option.value !== 'ADMIN_SYSTEM' ||
      currentUser?.role === 'ADMIN_SYSTEM' ||
      formData.role === 'ADMIN_SYSTEM'
    )),
    [currentUser?.role, formData.role],
  );

  const selectedIsSelf = selectedUser?.id === currentUser?.id;
  const selectedIsLockedSystemAdmin =
    selectedUser?.role === 'ADMIN_SYSTEM' &&
    currentUser?.role !== 'ADMIN_SYSTEM' &&
    !selectedIsSelf;
  const selectedRoleMeta = getRoleMeta(formData.role);

  function startCreate() {
    setMode('create');
    setSelectedUserId(null);
    setFormData(EMPTY_FORM);
  }

  function startEdit(user) {
    setMode('edit');
    setSelectedUserId(user.id);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'ANALYST',
    });
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (selectedIsLockedSystemAdmin) {
      showError('Only system administrators can edit system administrators.');
      return;
    }

    if (mode === 'create' && formData.password.length < 8) {
      showError('Temporary password must be at least 8 characters.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
      };

      let response;
      if (mode === 'create') {
        response = await adminUsersApi.create({
          ...payload,
          password: formData.password,
        });
      } else {
        response = await adminUsersApi.update(selectedUserId, payload);
      }

      const savedUser = response.data.user;
      showSuccess(response.data.message || 'User saved successfully.');
      await loadUsers({ silent: true });
      setMode('edit');
      setSelectedUserId(savedUser.id);
      setFormData({
        name: savedUser.name || '',
        email: savedUser.email || '',
        password: '',
        role: savedUser.role || 'ANALYST',
      });
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to save user.'));
    } finally {
      setSaving(false);
    }
  }

  function canDeleteUser(user) {
    const isSelf = user.id === currentUser?.id;
    const isLockedSystemAdmin = user.role === 'ADMIN_SYSTEM' && currentUser?.role !== 'ADMIN_SYSTEM';
    return !isSelf && !isLockedSystemAdmin;
  }

  function getDeleteTitle(user) {
    if (user.id === currentUser?.id) return 'You cannot delete your own account';
    if (user.role === 'ADMIN_SYSTEM' && currentUser?.role !== 'ADMIN_SYSTEM') {
      return 'Only system administrators can delete this user';
    }
    return `Delete ${user.name}`;
  }

  async function handleDeleteConfirmed() {
    if (!confirmDeleteUser) return;

    setDeletingId(confirmDeleteUser.id);

    try {
      const response = await adminUsersApi.delete(confirmDeleteUser.id);
      showSuccess(response.data.message || 'User deleted successfully.');
      if (selectedUserId === confirmDeleteUser.id) {
        startCreate();
      }
      setConfirmDeleteUser(null);
      await loadUsers({ silent: true });
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to delete user.'));
    } finally {
      setDeletingId(null);
    }
  }

  function handleExport() {
    const headers = ['Name', 'Email', 'Role', 'Signals', 'Votes', 'Workshops', 'Created'];
    const rows = visibleUsers.map(user => [
      user.name,
      user.email,
      getRoleMeta(user.role).label,
      user.counts?.signals || 0,
      user.counts?.votes || 0,
      user.counts?.workshops || 0,
      formatDate(user.createdAt),
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'blue-horizon-users.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="user-management-page">
      <div className="page-header um-page-header">
        <div>
          <h1>User Management</h1>
          <p>Manage workspace access, administrative roles, and analyst participation.</p>
        </div>
        <div className="um-header-actions">
          <button className="btn btn-secondary" type="button" onClick={() => loadUsers()} disabled={loading}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="btn btn-secondary" type="button" onClick={handleExport} disabled={!visibleUsers.length}>
            <Download size={16} />
            Export
          </button>
          <button className="btn btn-primary" type="button" onClick={startCreate}>
            <Plus size={16} />
            New User
          </button>
        </div>
      </div>

      <div className="um-access-strip">
        <div>
          <ShieldCheck size={18} />
          <span>Admin-only controls</span>
        </div>
        <p>{visibleUsers.length} of {metrics.total} users visible</p>
      </div>

      <div className="um-stats-grid">
        <StatCard
          icon={Users}
          label="Total Users"
          value={metrics.total}
          detail={`${metrics.active} active contributors`}
          tone="primary"
        />
        <StatCard
          icon={ShieldCheck}
          label="Administrators"
          value={metrics.admins}
          detail="Dashboard and settings access"
          tone="admin"
        />
        <StatCard
          icon={UserCheck}
          label="Lead Analysts"
          value={metrics.leads}
          detail="Workshop coordination"
          tone="lead"
        />
        <StatCard
          icon={Activity}
          label="Analysts"
          value={metrics.analysts}
          detail="Signal scanning capacity"
          tone="analyst"
        />
      </div>

      <div className="um-content-grid">
        <section className="um-panel um-directory-panel">
          <div className="um-panel-header">
            <div>
              <h2>Workspace Directory</h2>
              <p>Review account activity and adjust role access.</p>
            </div>
            <div className="um-filter-controls">
              <div className="um-search">
                <Search size={17} />
                <input
                  type="search"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search users"
                  aria-label="Search users"
                />
              </div>
              <div className="um-role-filter" aria-label="Filter by role">
                {ROLE_FILTERS.map(filter => (
                  <button
                    key={filter.value}
                    type="button"
                    className={roleFilter === filter.value ? 'active' : ''}
                    onClick={() => setRoleFilter(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="um-table-scroll">
            <table className="um-user-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Activity</th>
                  <th>Joined</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5">
                      <div className="um-empty-state">Loading users...</div>
                    </td>
                  </tr>
                ) : visibleUsers.length ? (
                  visibleUsers.map(user => (
                    <tr key={user.id} className={selectedUserId === user.id ? 'selected' : ''}>
                      <td>
                        <div className="um-user-cell">
                          <UserAvatar className="um-avatar" name={user.name} size="compact" />
                          <div>
                            <strong>{user.name}</strong>
                            <span><Mail size={13} />{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td><RoleBadge role={user.role} /></td>
                      <td><ActivityMeter user={user} /></td>
                      <td>
                        <div className="um-date-cell">
                          <strong>{formatDate(user.createdAt)}</strong>
                          <span>Updated {timeAgo(user.updatedAt)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="um-row-actions">
                          <button
                            className="um-icon-button"
                            type="button"
                            onClick={() => startEdit(user)}
                            aria-label={`Edit ${user.name}`}
                            title={`Edit ${user.name}`}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="um-icon-button danger"
                            type="button"
                            onClick={() => setConfirmDeleteUser(user)}
                            disabled={!canDeleteUser(user) || deletingId === user.id}
                            aria-label={`Delete ${user.name}`}
                            title={getDeleteTitle(user)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">
                      <div className="um-empty-state">No users match the current filters.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="um-side-stack">
          <section className="um-panel um-form-panel">
            <div className="um-panel-header compact">
              <div>
                <h2>{mode === 'create' ? 'Create User' : 'Edit Access'}</h2>
                <p>{mode === 'create' ? 'Provision a new workspace account.' : 'Update profile details and role assignment.'}</p>
              </div>
              <span className="um-form-mode">
                {mode === 'create' ? <Plus size={15} /> : <KeyRound size={15} />}
                {mode === 'create' ? 'New' : 'Role'}
              </span>
            </div>

            {selectedIsLockedSystemAdmin && (
              <div className="um-form-warning">
                <ShieldCheck size={16} />
                Only system administrators can edit this account.
              </div>
            )}

            <form className="um-user-form" onSubmit={handleSubmit}>
              <label>
                <span>Full Name</span>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                  placeholder="Jane Strategist"
                />
              </label>
              <label>
                <span>Email Address</span>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  required
                  placeholder="jane@bluehorizon.local"
                />
              </label>
              {mode === 'create' && (
                <label>
                  <span>Temporary Password</span>
                  <input
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleFormChange}
                    minLength="8"
                    required
                    placeholder="At least 8 characters"
                  />
                </label>
              )}
              <label>
                <span>Role</span>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleFormChange}
                  disabled={(mode === 'edit' && selectedIsSelf) || selectedIsLockedSystemAdmin}
                >
                  {availableRoleOptions.map(option => (
                    <option
                      key={option.value}
                      value={option.value}
                      disabled={option.value === 'ADMIN_SYSTEM' && currentUser?.role !== 'ADMIN_SYSTEM'}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className={`um-role-note ${selectedRoleMeta.tone}`}>
                <Sparkles size={16} />
                <span>{selectedRoleMeta.helper}</span>
              </div>

              {mode === 'edit' && selectedIsSelf && (
                <div className="um-form-note">Your own role is locked from this page to protect the current session.</div>
              )}

              <div className="um-form-actions">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={startCreate}
                  disabled={saving}
                >
                  Reset
                </button>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={saving || selectedIsLockedSystemAdmin}
                >
                  {saving ? 'Saving...' : mode === 'create' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </form>
          </section>

          <section className="um-panel um-permission-panel">
            <div className="um-panel-header compact">
              <div>
                <h2>Role Coverage</h2>
                <p>Current access distribution across the workspace.</p>
              </div>
            </div>
            <div className="um-role-coverage">
              {ROLE_OPTIONS.map(option => {
                const count = users.filter(user => user.role === option.value).length;
                const width = getProgressFillWidth(count, metrics.total);

                return (
                  <div key={option.value} className="um-coverage-row">
                    <div>
                      <RoleBadge role={option.value} />
                      <strong>{count}</strong>
                    </div>
                    <span className="um-coverage-track">
                      <span className={option.tone} style={{ width: `${width}%` }} />
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </div>

      {confirmDeleteUser && (
        <div
          className="um-modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!deletingId) setConfirmDeleteUser(null);
          }}
        >
          <section
            className="um-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            onClick={event => event.stopPropagation()}
          >
            <span className="um-confirm-icon" aria-hidden="true">
              <AlertTriangle size={22} />
            </span>
            <div>
              <h2 id="delete-user-title">Delete User</h2>
              <p>
                This will remove <strong>{confirmDeleteUser.name}</strong> from the workspace.
                Signal ownership will be cleared and audit history will remain preserved.
              </p>
              <span>{confirmDeleteUser.email}</span>
            </div>
            <div className="um-confirm-actions">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setConfirmDeleteUser(null)}
                disabled={Boolean(deletingId)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                type="button"
                onClick={handleDeleteConfirmed}
                disabled={Boolean(deletingId)}
              >
                <Trash2 size={16} />
                {deletingId ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
