import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Copy, Crown, Mail, Plus, Search, UserPlus, Users, X } from 'lucide-react';
import { usersApi, workshopsApi } from '../../../api/api';
import { connectNotificationSocket } from '../../../api/notificationSocket';
import { useAuth } from '../../../hooks/useAuth';

const HORIZON_OPTIONS = [
  {
    value: 'H1',
    label: 'H1',
    title: 'Current Horizon',
    description: 'Focus on current operations and short-term workshop decisions.',
  },
  {
    value: 'H2',
    label: 'H2',
    title: 'Emerging Horizon',
    description: 'Explore transition opportunities and medium-term shifts.',
  },
  {
    value: 'H3',
    label: 'H3',
    title: 'Future Horizon',
    description: 'Map long-range transformation and weak signals.',
  },
];

const MEMBER_LIMIT = 20;
const ROLE_OPTIONS = ['Editor', 'Contributor'];

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'BH';
}

function formatRoleHint(role) {
  if (!role) return 'Workspace Member';
  return role
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function normalizeDirectoryUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roleHint: formatRoleHint(user.role),
    online: Boolean(user.online),
  };
}

function applyOnlineUsers(users, onlineUserIds = []) {
  const onlineIds = new Set(onlineUserIds.map(id => String(id)));

  return users.map(user => ({
    ...user,
    online: onlineIds.has(String(user.id)),
  }));
}

export default function NewWorkshop() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState({
    name: '',
    description: '',
    horizon: 'H1',
  });
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [members, setMembers] = useState([]);
  const [removingMemberIds, setRemovingMemberIds] = useState([]);
  const [copiedInvite, setCopiedInvite] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDirectoryUsers() {
      setDirectoryLoading(true);
      setDirectoryError('');

      try {
        const response = await usersApi.getDirectory();
        if (!isMounted) return;

        const users = (response.data.users || [])
          .filter(user => user.email)
          .map(user => normalizeDirectoryUser(user));

        setDirectoryUsers(users);
      } catch (error) {
        console.warn('Failed to load registered workshop invite users.', error);
        if (isMounted) {
          setDirectoryUsers([]);
          setDirectoryError('Registered users could not be loaded.');
        }
      } finally {
        if (isMounted) setDirectoryLoading(false);
      }
    }

    loadDirectoryUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const syncPresence = ({ onlineUserIds = [] } = {}) => {
      setDirectoryUsers(prev => applyOnlineUsers(prev, onlineUserIds));
      setMembers(prev => applyOnlineUsers(prev, onlineUserIds));
    };

    const socket = connectNotificationSocket({
      onConnected: syncPresence,
      onPresenceUpdate: syncPresence,
    });

    return () => {
      socket?.disconnect();
    };
  }, []);

  const hostMember = useMemo(() => ({
    id: currentUser?.id ? String(currentUser.id) : 'host',
    name: currentUser?.name || 'Current Host',
    email: currentUser?.email || 'Signed-in workspace user',
    online: true,
  }), [currentUser]);

  const memberCount = members.length + 1;

  const availableUsers = useMemo(() => {
    const normalizedQuery = memberQuery.trim().toLowerCase();
    const selectedIds = new Set(members.map(member => String(member.id)));

    return directoryUsers.filter(user => {
      const isSelected = selectedIds.has(String(user.id));
      const matchesQuery =
        !normalizedQuery ||
        user.name.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery);

      return !isSelected && matchesQuery;
    });
  }, [directoryUsers, memberQuery, members]);

  function updateField(field, value) {
    if (field === 'name' && value.trim()) {
      setNameError('');
    }

    setForm(prev => ({
      ...prev,
      [field]: value,
    }));
  }

  function addMember(user) {
    setMembers(prev => {
      const alreadySelected = prev.some(member => String(member.id) === String(user.id));
      if (alreadySelected || prev.length + 1 >= MEMBER_LIMIT) return prev;

      return [
        ...prev,
        {
          ...user,
          role: 'Contributor',
          addedAt: Date.now(),
        },
      ];
    });
  }

  function updateMemberRole(memberId, role) {
    setMembers(prev => prev.map(member => (
      member.id === memberId ? { ...member, role } : member
    )));
  }

  function removeMember(memberId) {
    setRemovingMemberIds(prev => (prev.includes(memberId) ? prev : [...prev, memberId]));

    window.setTimeout(() => {
      setMembers(prev => prev.filter(member => member.id !== memberId));
      setRemovingMemberIds(prev => prev.filter(id => id !== memberId));
    }, 220);
  }

  async function copyInviteLink() {
    const sessionSlug = form.name.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'new-workshop';
    const inviteLink = `${window.location.origin}/workshop/invite/${sessionSlug}`;

    try {
      await navigator.clipboard?.writeText(inviteLink);
    } catch (error) {
      console.warn('Clipboard copy failed.', error);
    }

    setCopiedInvite(true);
    window.setTimeout(() => setCopiedInvite(false), 1800);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const workshopName = form.name.trim();
    if (!workshopName) {
      setNameError('Workshop session name is required');
      return;
    }

    const workshopPayload = {
      name: workshopName,
      description: form.description.trim(),
      horizon: form.horizon,
    };

    setSaving(true);
    try {
      const response = await workshopsApi.create(workshopPayload);
      const createdWorkshop = response.data;

      if (createdWorkshop?.id) {
        navigate(`/workshop/${createdWorkshop.id}/radar`);
        return;
      }

      navigate('/workshop');
    } catch (error) {
      console.error(error);
      alert('Failed to create workshop session. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function renderDirectoryUser(user) {
    const isHost = String(user.id) === hostMember.id || user.email === hostMember.email;
    const isOnline = user.online || isHost;

    return (
      <article className={`workshop-user-row ${isHost ? 'host' : ''}`} key={user.id}>
        <span className="workshop-user-avatar">{getInitials(user.name)}</span>
        <span className={`workshop-online-dot ${isOnline ? 'online' : ''}`} aria-label={isOnline ? 'Online' : 'Offline'} />
        <div className="workshop-user-copy">
          <strong>{isHost && <Crown size={14} />} {user.name}</strong>
          <small><Mail size={12} /> {user.email}</small>
          <em>{isHost ? 'Workshop Host' : user.roleHint}</em>
        </div>
        <button
          type="button"
          className={`workshop-add-user ${isHost ? 'host-lock' : ''}`}
          onClick={() => addMember(user)}
          disabled={isHost || memberCount >= MEMBER_LIMIT}
          aria-label={isHost ? `${user.name} is the host` : `Add ${user.name}`}
        >
          {isHost ? <Crown size={16} /> : <Plus size={17} />}
        </button>
      </article>
    );
  }

  return (
    <div className="signal-form-page workshop-form-page">
      <div className="workshop-create-layout">
        <form className="card signal-form-card workshop-form-card" onSubmit={handleSubmit}>
          <div className="signal-form-hero">
            <Link to="/workshop" className="workshop-title-back-link">
              〱 Workshops
            </Link>
            <h1>New Workshop Session</h1>
            <p>Create a strategic workshop space for environmental scanning, radar mapping, and scenario generation.</p>
          </div>

          <div className="signal-form-divider" />

          <div className="form-group">
            <label className="form-label" htmlFor="workshop-name">
              Workshop Session Name <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              id="workshop-name"
              className="form-input"
              placeholder="e.g., University Executive Meeting"
              value={form.name}
              onChange={event => updateField('name', event.target.value)}
              style={{ borderColor: nameError ? 'red' : undefined }}
            />
            {nameError && (
              <p className="form-error-text">{nameError}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="workshop-description">Workshop Description</label>
            <textarea
              id="workshop-description"
              className="form-input"
              placeholder="Describe the workshop purpose, participants, or strategic question..."
              rows={5}
              value={form.description}
              onChange={event => updateField('description', event.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Primary Horizon</label>
            <div className="workshop-horizon-grid">
              {HORIZON_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`workshop-horizon-option ${form.horizon === option.value ? 'active' : ''}`}
                  onClick={() => updateField('horizon', option.value)}
                  aria-pressed={form.horizon === option.value}
                >
                  <span>{option.label}</span>
                  <strong>{option.title}</strong>
                  <small>{option.description}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="signal-form-footer">
            <span className="auto-save">Draft details stay on this page until you create the session.</span>
            <div className="flex gap-3">
              <Link to="/workshop" className="btn btn-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || !form.name.trim()}
                id="create-workshop-session-btn"
              >
                <Plus size={18} />
                {saving ? 'Creating...' : 'Create Session'}
              </button>
            </div>
          </div>
        </form>

        <aside className="workshop-invite-panel" aria-label="Invite workshop members">
          <div className="workshop-invite-header">
            <span className="workshop-invite-icon">
              <UserPlus size={20} />
            </span>
            <div>
              <h2>Invite Panel</h2>
              <p>{memberCount} Members · {memberCount}/{MEMBER_LIMIT} slots</p>
            </div>
          </div>

          <button
            type="button"
            className={`workshop-invite-copy ${copiedInvite ? 'copied' : ''}`}
            onClick={copyInviteLink}
          >
            {copiedInvite ? <Check size={17} /> : <Copy size={17} />}
            {copiedInvite ? '✓ Copied!' : 'Copy Invite Link'}
          </button>

          <div className="workshop-member-search">
            <Search size={17} />
            <input
              type="search"
              value={memberQuery}
              onChange={event => setMemberQuery(event.target.value)}
              placeholder="Search name or email..."
              aria-label="Search users by name or email"
            />
          </div>

          <div className="workshop-user-tabs" aria-label="User filters">
            <button type="button" className="active">All Users</button>
          </div>

          <div className="workshop-user-results">
            {!directoryLoading && !directoryError && availableUsers.map(renderDirectoryUser)}
            {directoryLoading && (
              <p className="workshop-invite-empty">Loading registered users...</p>
            )}
            {!directoryLoading && directoryError && (
              <p className="workshop-invite-empty">{directoryError}</p>
            )}
            {!directoryLoading && !directoryError && !availableUsers.length && (
              <p className="workshop-invite-empty">
                {memberQuery.trim() ? 'No matching registered users.' : 'No registered users found.'}
              </p>
            )}
          </div>

          <section className="workshop-members-panel" aria-label="Workshop members list">
            <div className="workshop-members-title">
              <Users size={17} />
              <h3>Members list</h3>
            </div>

            <div className="workshop-member-list">
              <article className="workshop-member-row host">
                <span className="workshop-user-avatar">{getInitials(hostMember.name)}</span>
                <span className="workshop-online-dot online" aria-label="Online" />
                <div className="workshop-user-copy">
                  <strong><Crown size={15} /> {hostMember.name}</strong>
                  <small>{hostMember.email}</small>
                </div>
                <span className="workshop-host-role">Host</span>
              </article>

              {members.map(member => {
                const isRemoving = removingMemberIds.includes(member.id);

                return (
                  <article
                    className={`workshop-member-row ${isRemoving ? 'removing' : 'added'}`}
                    key={member.id}
                  >
                    <span className="workshop-user-avatar">{getInitials(member.name)}</span>
                    <span className={`workshop-online-dot ${member.online ? 'online' : ''}`} aria-label={member.online ? 'Online' : 'Offline'} />
                    <div className="workshop-user-copy">
                      <strong>{member.name}</strong>
                      <small>{member.email}</small>
                    </div>
                    <div className="workshop-member-actions">
                      <select
                        value={member.role}
                        onChange={event => updateMemberRole(member.id, event.target.value)}
                        aria-label={`Role for ${member.name}`}
                      >
                        {ROLE_OPTIONS.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="workshop-remove-member"
                        onClick={() => removeMember(member.id)}
                        aria-label={`Remove ${member.name}`}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
