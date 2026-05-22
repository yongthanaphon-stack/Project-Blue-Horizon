import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Activity,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  KeyRound,
  Link2,
  Mail,
  MessageSquareText,
  Monitor,
  Save,
  ShieldCheck,
  Signal,
  UserRound,
  UsersRound,
} from 'lucide-react';
import UserIdentityBlock from '../../components/UserIdentityBlock';
import { notificationsApi, profileApi } from '../../api/api';
import { refreshSessionSuccess } from '../../app/store/slices/authSlice';
import { formatDate, formatTime } from '../../utils/date';
import { getRoleLabel } from '../../utils/roles';
import './Profile.css';

const DEFAULT_NOTIFICATION_PREFERENCES = {
  dailySummary: true,
  scenarioUpdates: true,
  signalVotes: true,
  workshopReminders: true,
};

const NOTIFICATION_ITEMS = [
  {
    key: 'dailySummary',
    icon: Bell,
    label: 'Daily briefing',
    helper: 'Receive the daily foresight digest.',
  },
  {
    key: 'scenarioUpdates',
    icon: Monitor,
    label: 'Scenario updates',
    helper: 'Notify me when scenario work changes.',
  },
  {
    key: 'signalVotes',
    icon: Signal,
    label: 'Signal voting',
    helper: 'Alert me when my signals receive votes.',
  },
  {
    key: 'workshopReminders',
    icon: UsersRound,
    label: 'Workshop reminders',
    helper: 'Remind me before active workshop sessions.',
  },
];

const ACTIVITY_ICONS = {
  notification: Bell,
  signal: Signal,
  vote: MessageSquareText,
  workshop: UsersRound,
};

const DEFAULT_PROFILE_STATS = {
  signals: 0,
  signalsThisMonth: 0,
  workshops: 0,
  votes: 0,
  securityLabel: 'Protected',
};

function getDisplayName(profile) {
  return profile?.name || '-';
}

function getDisplayEmail(profile) {
  return profile?.email || '-';
}

function getJoinDate(profile) {
  return formatDate(profile?.createdAt);
}

function formatActivityMeta(occurredAt) {
  if (!occurredAt) return '-';

  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) return '-';

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const timeLabel = formatTime(occurredAt);

  if (date.toDateString() === today.toDateString()) {
    return `Today at ${timeLabel}`;
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${timeLabel}`;
  }

  return formatDate(occurredAt);
}

function buildProfileStats(stats = DEFAULT_PROFILE_STATS) {
  const signalsHelper = stats.signalsThisMonth > 0
    ? `${stats.signalsThisMonth} curated this month`
    : 'Owned workspace signals';

  return [
    {
      icon: Signal,
      label: 'Signals',
      value: String(stats.signals ?? 0),
      helper: signalsHelper,
    },
    {
      icon: UsersRound,
      label: 'Workshops',
      value: String(stats.workshops ?? 0),
      helper: 'Active sessions',
    },
    {
      icon: MessageSquareText,
      label: 'Votes',
      value: String(stats.votes ?? 0),
      helper: 'Signals you rated',
    },
    {
      icon: ShieldCheck,
      label: 'Security',
      value: stats.securityLabel || 'Protected',
      helper: 'Account password status',
    },
  ];
}

function getApiError(error, fallback) {
  const message = error.response?.data?.message || error.response?.data?.error;
  if (Array.isArray(message)) return message.join(' ');
  return message || fallback;
}

function ProfileAlert({ status }) {
  if (!status.message) return null;
  const Icon = status.type === 'error' ? CircleAlert : Check;

  return (
    <div className={`profile-alert profile-alert-${status.type}`} role="status">
      <Icon size={18} />
      <span>{status.message}</span>
    </div>
  );
}

function ProfilePanel({ children, icon: Icon, subtitle, title }) {
  return (
    <section className="profile-panel">
      <div className="profile-panel-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {Icon && (
          <span className="profile-panel-icon">
            <Icon size={18} />
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function ProfileCategory({ children, description, title }) {
  return (
    <section className="profile-category">
      <div className="profile-category-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function Profile() {
  const dispatch = useDispatch();
  const [profile, setProfile] = useState(null);
  const [profileStats, setProfileStats] = useState(DEFAULT_PROFILE_STATS);
  const [activityItems, setActivityItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: 'success', message: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPreference, setSavingPreference] = useState('');
  const [notificationPrefs, setNotificationPrefs] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [validationErrors, setValidationErrors] = useState({});
  const [formData, setFormData] = useState({
    confirmPassword: '',
    currentPassword: '',
    email: '',
    name: '',
    newPassword: '',
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchProfile() {
      try {
        const response = await profileApi.getProfile();
        const { activity = [], stats, user: userData } = response.data;

        if (!isMounted) return;

        setProfile(userData);
        setProfileStats({ ...DEFAULT_PROFILE_STATS, ...stats });
        setActivityItems(Array.isArray(activity) ? activity : []);
        setFormData(prev => ({
          ...prev,
          email: userData.email || '',
          name: userData.name || '',
        }));
      } catch {
        if (isMounted) {
          setStatus({ type: 'error', message: 'Failed to load profile.' });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchNotificationPreferences() {
      try {
        const response = await notificationsApi.getPreferences();
        const preferences = response.data || {};

        if (!isMounted) return;

        setNotificationPrefs(prev => {
          const nextPreferences = {};

          Object.keys(DEFAULT_NOTIFICATION_PREFERENCES).forEach(key => {
            if (typeof preferences[key] === 'boolean') {
              nextPreferences[key] = preferences[key];
            }
          });

          return {
            ...prev,
            ...nextPreferences,
          };
        });
      } catch {
        // Profile remains usable when notification preferences are unavailable.
      }
    }

    fetchNotificationPreferences();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const nextErrors = { ...prev };
        delete nextErrors[name];
        return nextErrors;
      });
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    const nextName = formData.name.trim();
    const nextEmail = formData.email.trim().toLowerCase();
    const errors = {};

    if (!nextName) errors.name = 'Name is required';
    if (!nextEmail) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      errors.email = 'Invalid email address';
    }

    if (Object.keys(errors).length) {
      setValidationErrors(errors);
      setStatus({ type: 'error', message: 'Please check the highlighted fields.' });
      return;
    }

    setSavingProfile(true);
    setStatus({ type: 'success', message: '' });

    try {
      const response = await profileApi.updateProfile({
        email: nextEmail,
        name: nextName,
      });
      const nextUser = response.data.user;

      setProfile(nextUser);
      setFormData(prev => ({
        ...prev,
        email: nextUser.email || '',
        name: nextUser.name || '',
      }));
      dispatch(refreshSessionSuccess({ token: response.data.token, user: nextUser }));
      setStatus({ type: 'success', message: 'Personal information saved.' });
    } catch (error) {
      setStatus({ type: 'error', message: getApiError(error, 'Failed to save profile.') });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    const errors = {};

    if (!formData.currentPassword) errors.currentPassword = 'Current password is required';
    if (!formData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters.';
    }
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'Please make sure your passwords match.';
    }

    if (Object.keys(errors).length) {
      setValidationErrors(errors);
      setStatus({ type: 'error', message: 'Please complete the password fields.' });
      return;
    }

    setSavingPassword(true);
    setStatus({ type: 'success', message: '' });

    try {
      const response = await profileApi.updateProfile({
        confirmPassword: formData.confirmPassword,
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      const nextUser = response.data.user;

      setProfile(nextUser);
      dispatch(refreshSessionSuccess({ token: response.data.token, user: nextUser }));
      setFormData(prev => ({
        ...prev,
        confirmPassword: '',
        currentPassword: '',
        newPassword: '',
      }));
      setStatus({ type: 'success', message: 'Password updated.' });
    } catch (error) {
      setStatus({ type: 'error', message: getApiError(error, 'Failed to update password.') });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleNotificationToggle(key) {
    const nextValue = !notificationPrefs[key];
    setNotificationPrefs(prev => ({ ...prev, [key]: nextValue }));
    setSavingPreference(key);
    setStatus({ type: 'success', message: '' });

    try {
      await notificationsApi.updatePreferences({ [key]: nextValue });
      setStatus({ type: 'success', message: 'Notification preference saved.' });
    } catch {
      setNotificationPrefs(prev => ({ ...prev, [key]: !nextValue }));
      setStatus({ type: 'error', message: 'Failed to sync notification preference.' });
    } finally {
      setSavingPreference('');
    }
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  const displayName = getDisplayName(profile);
  const displayEmail = getDisplayEmail(profile);
  const joinDate = getJoinDate(profile);
  const roleLabel = getRoleLabel(profile?.role);
  const profileStatCards = buildProfileStats(profileStats);
  const connectedAccounts = [
    {
      icon: Mail,
      name: 'Workspace email',
      detail: displayEmail,
      status: 'Connected',
      connected: true,
    },
    {
      icon: Building2,
      name: 'Blue Horizon workspace',
      detail: roleLabel,
      status: 'Active',
      connected: true,
    },
  ];

  return (
    <div className="profile-page">
      <ProfileAlert status={status} />

      <div className="page-header profile-page-header">
        <div>
          <h1>Profile</h1>
          <p>Manage your identity, security, and workspace preferences.</p>
        </div>
        <div className="profile-header-actions">
          <button
            type="submit"
            form="profile-personal-form"
            className="btn btn-primary"
            disabled={savingProfile}
          >
            <Save size={18} />
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      <section className="profile-hero-card">
        <UserIdentityBlock
          email={displayEmail}
          name={displayName}
          roleLabel={roleLabel}
          showActive
          variant="profile"
        />

        <div className="profile-hero-meta">
          <div>
            <CalendarDays size={18} />
            <span>Joined</span>
            <strong>{joinDate}</strong>
          </div>
          <div>
            <Clock3 size={18} />
            <span>Last Updated</span>
            <strong>{formatDate(profile?.updatedAt)}</strong>
          </div>
        </div>
      </section>

      <div className="profile-layout-grid">
        <main className="profile-layout-main" aria-label="Profile workspace">
          <ProfileCategory
            title="Account Details"
            description="Edit the profile information collaborators see across the workspace."
          >
            <ProfilePanel
              icon={UserRound}
              title="Personal Information"
              subtitle="Keep your name, email, and workspace identity up to date."
            >
              <form id="profile-personal-form" className="profile-form" onSubmit={handleProfileSubmit}>
                <div className="profile-form-grid">
                  <label className="profile-field" htmlFor="name">
                    <span>Full Name</span>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={validationErrors.name ? 'profile-input-error' : ''}
                      placeholder="Enter your name"
                    />
                    {validationErrors.name && <small>{validationErrors.name}</small>}
                  </label>

                  <label className="profile-field" htmlFor="email">
                    <span>Email Address</span>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={validationErrors.email ? 'profile-input-error' : ''}
                      placeholder="Enter your email"
                    />
                    {validationErrors.email && <small>{validationErrors.email}</small>}
                  </label>

                  <div className="profile-readonly-field">
                    <span>Role</span>
                    <strong>{roleLabel}</strong>
                  </div>

                  <div className="profile-readonly-field">
                    <span>Member Since</span>
                    <strong>{joinDate}</strong>
                  </div>
                </div>

                <div className="profile-action-row">
                  <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                    <Save size={18} />
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </ProfilePanel>
          </ProfileCategory>

          <ProfileCategory
            title="Security"
            description="Update password protection without leaving your profile."
          >
            <ProfilePanel
              icon={ShieldCheck}
              title="Security Settings"
              subtitle="Change your password and keep account access protected."
            >
              <form className="profile-form" onSubmit={handlePasswordSubmit}>
                <div className="profile-form-grid">
                  <label className="profile-field profile-field-full" htmlFor="currentPassword">
                    <span>Current Password</span>
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      className={validationErrors.currentPassword ? 'profile-input-error' : ''}
                      placeholder="Enter current password"
                    />
                    {validationErrors.currentPassword && <small>{validationErrors.currentPassword}</small>}
                  </label>

                  <label className="profile-field" htmlFor="newPassword">
                    <span>New Password</span>
                    <input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      className={validationErrors.newPassword ? 'profile-input-error' : ''}
                      placeholder="At least 8 characters"
                    />
                    {validationErrors.newPassword && <small>{validationErrors.newPassword}</small>}
                  </label>

                  <label className="profile-field" htmlFor="confirmPassword">
                    <span>Confirm Password</span>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={validationErrors.confirmPassword ? 'profile-input-error' : ''}
                      placeholder="Confirm new password"
                    />
                    {validationErrors.confirmPassword && <small>{validationErrors.confirmPassword}</small>}
                  </label>
                </div>

                <div className="profile-security-note">
                  <KeyRound size={18} />
                  <span>Password changes update the authenticated session automatically.</span>
                </div>

                <div className="profile-action-row">
                  <button type="submit" className="btn btn-secondary" disabled={savingPassword}>
                    <ShieldCheck size={18} />
                    {savingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </ProfilePanel>
          </ProfileCategory>

          <ProfileCategory
            title="Activity"
            description="Review the latest profile, signal, voting, and workshop actions."
          >
            <ProfilePanel icon={Activity} title="Recent Activity" subtitle="Latest profile and workspace signals.">
              <div className="profile-activity-list">
                {activityItems.length ? activityItems.map(item => {
                  const ActivityIcon = ACTIVITY_ICONS[item.kind] || Activity;
                  return (
                    <div key={`${item.kind}-${item.title}-${item.occurredAt}`} className="profile-activity-row">
                      <span className="profile-row-icon">
                        <ActivityIcon size={18} />
                      </span>
                      <div>
                        <strong>{item.title}</strong>
                        <span>{formatActivityMeta(item.occurredAt)}</span>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="profile-empty-state">No recent activity yet.</p>
                )}
              </div>
            </ProfilePanel>
          </ProfileCategory>
        </main>

        <aside className="profile-layout-rail" aria-label="Profile summary and preferences">
          <ProfileCategory
            title="Overview"
            description="At-a-glance contribution and account status."
          >
            <div className="profile-stats-grid profile-stats-grid--rail">
              {profileStatCards.map(stat => {
                const StatIcon = stat.icon;
                return (
                  <article key={stat.label} className="profile-stat-card">
                    <span className="profile-stat-icon">
                      <StatIcon size={20} />
                    </span>
                    <div>
                      <span className="profile-stat-label">{stat.label}</span>
                      <strong>{stat.value}</strong>
                      <small>{stat.helper}</small>
                    </div>
                  </article>
                );
              })}
            </div>
          </ProfileCategory>

          <ProfileCategory
            title="Preferences"
            description="Control workspace notifications quickly."
          >
            <ProfilePanel icon={Bell} title="Notification Settings" subtitle="Choose which updates reach you.">
              <div className="profile-toggle-list">
                {NOTIFICATION_ITEMS.map(item => {
                  const PreferenceIcon = item.icon;
                  const checked = notificationPrefs[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`profile-toggle-row ${checked ? 'active' : ''}`}
                      onClick={() => handleNotificationToggle(item.key)}
                      disabled={savingPreference === item.key}
                      aria-pressed={checked}
                    >
                      <span className="profile-toggle-icon">
                        <PreferenceIcon size={18} />
                      </span>
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.helper}</small>
                      </span>
                      <span className="profile-switch" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </ProfilePanel>
          </ProfileCategory>

          <ProfileCategory
            title="Connected Accounts"
            description="Workspace identity and linked access."
          >
            <ProfilePanel icon={Link2} title="Workspace Links" subtitle="Accounts currently connected to this profile.">
              <div className="profile-connected-list">
                {connectedAccounts.map(account => {
                  const AccountIcon = account.icon;
                  return (
                    <div key={account.name} className="profile-connected-row">
                      <span className="profile-row-icon">
                        <AccountIcon size={18} />
                      </span>
                      <div>
                        <strong>{account.name}</strong>
                        <span>{account.detail}</span>
                      </div>
                      <span className={account.connected ? 'profile-chip-success' : 'profile-chip-muted'}>
                        {account.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </ProfilePanel>
          </ProfileCategory>
        </aside>
      </div>
    </div>
  );
}
