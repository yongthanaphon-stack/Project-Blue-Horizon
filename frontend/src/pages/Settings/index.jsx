import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  Check,
  CircleAlert,
  Database,
  LockKeyhole,
  Mail,
  Monitor,
  RefreshCw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { notificationsApi, profileApi } from '../../api/api';
import { refreshSessionSuccess } from '../../app/store/slices/authSlice';
import { DEFAULT_FONT_PREFERENCE, FONT_OPTIONS, getFontOption } from '../../constants/fontPreferences';
import UserIdentityBlock from '../../components/UserIdentityBlock';
import { getRoleLabel } from '../../utils/roles';
import './Settings.css';

const SETTINGS_STORAGE_KEY = 'blueHorizonSettings';

const DEFAULT_SETTINGS = {
  colorMode: 'light',
  defaultWorkspace: '/signals',
  interfaceDensity: 'comfortable',
  notifications: {
    dailySummary: true,
    scenarioUpdates: true,
    signalNeedsVote: true,
    signalVotes: true,
    swotUpdates: true,
    systemAnnouncements: true,
    workshopReminders: true,
  },
  workspace: {
    defaultHorizon: 'H2',
    pestelDefaults: [
      'POLITICAL',
      'ECONOMIC',
      'SOCIAL',
      'TECHNOLOGICAL',
      'ENVIRONMENTAL',
      'LEGAL',
    ],
    publishMode: 'review',
  },
};

const COLOR_OPTIONS = [
  { value: 'system', label: 'System', locked: true },
  { value: 'light', label: 'Light' },
  { value: 'focus', label: 'Focus', locked: true },
];

const DENSITY_OPTIONS = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
];

const WORKSPACE_OPTIONS = [
  { value: '/signals', label: 'Signal Bank', helper: 'Scanning queue' },
  { value: '/workshop', label: 'Workshop', helper: 'Workshop flow' },
  { value: '/dashboard', label: 'Dashboard', helper: 'Admin overview', adminOnly: true },
];

const HORIZON_OPTIONS = [
  { value: 'H1', label: 'H1', helper: 'Near term' },
  { value: 'H2', label: 'H2', helper: 'Mid horizon' },
  { value: 'H3', label: 'H3', helper: 'Long horizon' },
];

const PUBLISH_OPTIONS = [
  { value: 'review', label: 'Review first' },
  { value: 'direct', label: 'Direct publish' },
];

const PESTEL_OPTIONS = [
  { value: 'POLITICAL', label: 'Political' },
  { value: 'ECONOMIC', label: 'Economic' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'TECHNOLOGICAL', label: 'Tech' },
  { value: 'ENVIRONMENTAL', label: 'Environment' },
  { value: 'LEGAL', label: 'Legal' },
];

function mergeSettings(savedSettings) {
  const mergedSettings = {
    ...DEFAULT_SETTINGS,
    ...savedSettings,
    notifications: {
      ...DEFAULT_SETTINGS.notifications,
      ...savedSettings?.notifications,
    },
    workspace: {
      ...DEFAULT_SETTINGS.workspace,
      ...savedSettings?.workspace,
      pestelDefaults: Array.isArray(savedSettings?.workspace?.pestelDefaults)
        ? savedSettings.workspace.pestelDefaults
        : DEFAULT_SETTINGS.workspace.pestelDefaults,
    },
  };
  const canUseColorMode = COLOR_OPTIONS.some(
    option => option.value === mergedSettings.colorMode && !option.locked,
  );

  return {
    ...mergedSettings,
    colorMode: canUseColorMode ? mergedSettings.colorMode : DEFAULT_SETTINGS.colorMode,
  };
}

function readSettings() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  try {
    const savedSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return savedSettings ? mergeSettings(JSON.parse(savedSettings)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(settings) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function getApiError(error, fallback) {
  const message = error.response?.data?.message || error.response?.data?.error;
  if (Array.isArray(message)) return message.join(' ');
  return message || fallback;
}

function SettingsAlert({ status }) {
  if (!status.message) return null;
  const Icon = status.type === 'error' ? CircleAlert : Check;

  return (
    <div className={`settings-alert settings-alert-${status.type}`} role="status">
      <Icon size={18} />
      <span>{status.message}</span>
    </div>
  );
}

function SegmentedControl({ label, options, value, onChange }) {
  return (
    <div className="settings-control-group">
      <span>{label}</span>
      <div className="settings-segmented" role="group" aria-label={label}>
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            className={`${value === option.value ? 'active' : ''} ${option.locked ? 'locked' : ''}`}
            disabled={option.locked}
            onClick={() => onChange(option.value)}
            title={option.locked ? 'Coming soon' : undefined}
          >
            {option.locked && <LockKeyhole size={13} />}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function OptionGrid({ disabled = false, options, value, onChange }) {
  return (
    <div className="settings-option-grid">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          className={`settings-option-card ${value === option.value ? 'active' : ''}`}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          style={option.fontFamily ? { fontFamily: option.fontFamily } : undefined}
        >
          <strong>{option.label}</strong>
          <span>{option.helper}</span>
        </button>
      ))}
    </div>
  );
}

function ToggleRow({ checked, icon, label, onChange }) {
  const ToggleIcon = icon;

  return (
    <button
      type="button"
      className={`settings-toggle-row ${checked ? 'active' : ''}`}
      onClick={onChange}
      aria-pressed={checked}
    >
      <span className="settings-toggle-icon">
        <ToggleIcon size={18} />
      </span>
      <span>{label}</span>
      <span className="settings-switch" aria-hidden="true" />
    </button>
  );
}

export default function Settings() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { canViewAdmin, roleLabel, user } = useAuth();
  const [activeSection, setActiveSection] = useState('account');
  const [settings, setSettings] = useState(() => readSettings());
  const [status, setStatus] = useState({ type: 'success', message: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [profileForm, setProfileForm] = useState({
    email: user?.email || '',
    name: user?.name || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    confirmPassword: '',
    currentPassword: '',
    newPassword: '',
  });

  const sections = useMemo(() => {
    const baseSections = [
      { id: 'account', icon: UserRound, label: 'Account' },
      { id: 'preferences', icon: SlidersHorizontal, label: 'Preferences' },
      { id: 'security', icon: ShieldCheck, label: 'Security' },
    ];

    if (!canViewAdmin) return baseSections;
    return [...baseSections, { id: 'workspace', icon: Building2, label: 'Workspace' }];
  }, [canViewAdmin]);

  const workspaceOptions = useMemo(
    () => WORKSPACE_OPTIONS.filter(option => canViewAdmin || !option.adminOnly),
    [canViewAdmin],
  );
  const activeDefaultWorkspace =
    canViewAdmin || settings.defaultWorkspace !== '/dashboard'
      ? settings.defaultWorkspace
      : '/signals';
  const activePreferredFont = getFontOption(user?.preferredFont || DEFAULT_FONT_PREFERENCE).value;

  useEffect(() => {
    let isMounted = true;

    async function loadNotificationPreferences() {
      try {
        const response = await notificationsApi.getPreferences();
        const preferences = response.data || {};

        if (!isMounted) return;

        setSettings(prevSettings => {
          const nextSettings = {
            ...prevSettings,
            notifications: {
              ...prevSettings.notifications,
              dailySummary: Boolean(preferences.dailySummary),
              scenarioUpdates: Boolean(preferences.scenarioUpdates),
              signalNeedsVote: Boolean(preferences.signalNeedsVote),
              signalVotes: Boolean(preferences.signalVotes),
              swotUpdates: Boolean(preferences.swotUpdates),
              systemAnnouncements: Boolean(preferences.systemAnnouncements),
              workshopReminders: Boolean(preferences.workshopReminders),
            },
          };
          persistSettings(nextSettings);
          return nextSettings;
        });
      } catch {
        // Local settings remain usable if the API is unavailable.
      }
    }

    loadNotificationPreferences();

    return () => {
      isMounted = false;
    };
  }, []);

  function showStatus(type, message) {
    setStatus({ type, message });
  }

  function updateSettings(updater, message = 'Settings saved.') {
    setSettings(prevSettings => {
      const nextSettings = updater(prevSettings);
      persistSettings(nextSettings);
      return nextSettings;
    });
    showStatus('success', message);
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    const nextName = profileForm.name.trim();
    const nextEmail = profileForm.email.trim().toLowerCase();

    if (!nextName || !nextEmail) {
      showStatus('error', 'Name and email are required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      showStatus('error', 'Enter a valid email address.');
      return;
    }

    setSavingProfile(true);
    showStatus('success', '');

    try {
      const response = await profileApi.updateProfile({
        email: nextEmail,
        name: nextName,
      });
      const nextUser = response.data.user;
      dispatch(refreshSessionSuccess({ token: response.data.token, user: nextUser }));
      setProfileForm({
        email: nextUser.email || '',
        name: nextUser.name || '',
      });
      showStatus('success', 'Account profile saved.');
    } catch (error) {
      showStatus('error', getApiError(error, 'Failed to save account profile.'));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showStatus('error', 'Complete all password fields.');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      showStatus('error', 'New password must be at least 8 characters.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showStatus('error', 'New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    showStatus('success', '');

    try {
      const response = await profileApi.updateProfile({
        confirmPassword: passwordForm.confirmPassword,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      dispatch(refreshSessionSuccess({ token: response.data.token, user: response.data.user }));
      setPasswordForm({
        confirmPassword: '',
        currentPassword: '',
        newPassword: '',
      });
      showStatus('success', 'Password updated.');
    } catch (error) {
      showStatus('error', getApiError(error, 'Failed to update password.'));
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleResetSettings() {
    persistSettings(DEFAULT_SETTINGS);
    setSettings(DEFAULT_SETTINGS);

    if (activePreferredFont === DEFAULT_FONT_PREFERENCE) {
      showStatus('success', 'Preferences reset.');
      return;
    }

    setSavingPreferences(true);
    try {
      const response = await profileApi.updatePreferences({
        preferredFont: DEFAULT_FONT_PREFERENCE,
      });
      dispatch(refreshSessionSuccess({
        token: response.data.token,
        user: response.data.user,
      }));
      showStatus('success', 'Preferences reset.');
    } catch {
      showStatus('error', 'Local preferences reset, but account font sync failed.');
    } finally {
      setSavingPreferences(false);
    }
  }

  async function handleNotificationToggle(key) {
    const nextValue = !settings.notifications[key];

    updateSettings(
      prevSettings => ({
        ...prevSettings,
        notifications: {
          ...prevSettings.notifications,
          [key]: nextValue,
        },
      }),
      'Notification preferences saved.',
    );

    try {
      await notificationsApi.updatePreferences({ [key]: nextValue });
    } catch {
      showStatus('error', 'Saved locally, but notification sync failed.');
    }
  }

  async function handleFontPreferenceChange(preferredFont) {
    if (preferredFont === activePreferredFont || savingPreferences) return;

    setSavingPreferences(true);
    showStatus('success', '');

    try {
      const response = await profileApi.updatePreferences({ preferredFont });
      dispatch(refreshSessionSuccess({
        token: response.data.token,
        user: response.data.user,
      }));
      showStatus('success', 'Font preference saved to your account.');
    } catch (error) {
      showStatus('error', getApiError(error, 'Failed to save font preference.'));
    } finally {
      setSavingPreferences(false);
    }
  }

  function handlePestelToggle(value) {
    updateSettings(
      prevSettings => {
        const currentDefaults = prevSettings.workspace.pestelDefaults;
        const nextDefaults = currentDefaults.includes(value)
          ? currentDefaults.filter(item => item !== value)
          : [...currentDefaults, value];

        return {
          ...prevSettings,
          workspace: {
            ...prevSettings.workspace,
            pestelDefaults: nextDefaults,
          },
        };
      },
      'Workspace defaults saved.',
    );
  }

  const displayName = user?.name || 'Blue Horizon User';
  const displayEmail = user?.email || 'user@bluehorizon.com';

  return (
    <div className="settings-page">
      <div className="page-header settings-page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your profile, preferences, and security in one place.</p>
        </div>
        <div className="settings-header-actions">
          <button className="btn btn-secondary" type="button" onClick={() => navigate('/profile')}>
            <UserRound size={16} />
            Profile
          </button>
          <button className="btn btn-secondary" type="button" onClick={handleResetSettings}>
            <RefreshCw size={16} />
            Reset
          </button>
        </div>
      </div>

      <SettingsAlert status={status} />

      <div className="settings-shell">
        <aside className="settings-sidebar-panel">
          <UserIdentityBlock
            className="settings-user-summary"
            email={displayEmail}
            name={displayName}
            roleLabel={roleLabel || getRoleLabel(user?.role)}
            variant="settings"
          />

          <nav className="settings-nav" aria-label="Settings sections">
            {sections.map(section => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  type="button"
                  className={activeSection === section.id ? 'active' : ''}
                  onClick={() => setActiveSection(section.id)}
                >
                  <Icon size={18} />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="settings-content">
          {activeSection === 'account' && (
            <section className="settings-panel">
              <div className="settings-panel-header">
                <div>
                  <h2>Account Profile</h2>
                  <p>Keep your identity current across the workspace.</p>
                </div>
                <UserRound size={22} />
              </div>

              <form className="settings-form" onSubmit={handleProfileSubmit}>
                <div className="settings-form-grid">
                  <label className="settings-field">
                    <span>Full Name</span>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={event => setProfileForm(prev => ({ ...prev, name: event.target.value }))}
                      autoComplete="name"
                    />
                  </label>
                  <label className="settings-field">
                    <span>Email Address</span>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={event => setProfileForm(prev => ({ ...prev, email: event.target.value }))}
                      autoComplete="email"
                    />
                  </label>
                </div>

                <div className="settings-submit-row">
                  <button className="btn btn-primary" type="submit" disabled={savingProfile}>
                    <Save size={16} />
                    {savingProfile ? 'Saving...' : 'Save Account'}
                  </button>
                </div>
              </form>
            </section>
          )}

          {activeSection === 'preferences' && (
            <section className="settings-panel">
              <div className="settings-panel-header">
                <div>
                  <h2>Workspace Preferences</h2>
                  <p>Local workspace preferences plus account-saved typography.</p>
                </div>
                <SlidersHorizontal size={22} />
              </div>

              <div className="settings-stack">
                <SegmentedControl
                  label="Theme"
                  options={COLOR_OPTIONS}
                  value={settings.colorMode}
                  onChange={colorMode =>
                    updateSettings(prevSettings => ({ ...prevSettings, colorMode }))
                  }
                />
                <SegmentedControl
                  label="Density"
                  options={DENSITY_OPTIONS}
                  value={settings.interfaceDensity}
                  onChange={interfaceDensity =>
                    updateSettings(prevSettings => ({ ...prevSettings, interfaceDensity }))
                  }
                />

                <div className="settings-control-group">
                  <span>Typography</span>
                  <OptionGrid
                    disabled={savingPreferences}
                    options={FONT_OPTIONS}
                    value={activePreferredFont}
                    onChange={handleFontPreferenceChange}
                  />
                </div>

                <div className="settings-control-group">
                  <span>Default Workspace</span>
                  <OptionGrid
                    options={workspaceOptions}
                    value={activeDefaultWorkspace}
                    onChange={defaultWorkspace =>
                      updateSettings(prevSettings => ({ ...prevSettings, defaultWorkspace }))
                    }
                  />
                </div>

                <button
                  className="settings-open-default"
                  type="button"
                  onClick={() => navigate(activeDefaultWorkspace)}
                >
                  <Monitor size={18} />
                  Open default workspace
                </button>

                <div className="settings-divider" />

                <div className="settings-control-group">
                  <span>Notifications</span>
                  <div className="settings-toggle-list">
                    <ToggleRow
                      checked={settings.notifications.dailySummary}
                      icon={Mail}
                      label="Daily summary"
                      onChange={() => handleNotificationToggle('dailySummary')}
                    />
                    <ToggleRow
                      checked={settings.notifications.signalVotes}
                      icon={Bell}
                      label="Signal vote updates"
                      onChange={() => handleNotificationToggle('signalVotes')}
                    />
                    <ToggleRow
                      checked={settings.notifications.signalNeedsVote}
                      icon={Database}
                      label="Signals needing votes"
                      onChange={() => handleNotificationToggle('signalNeedsVote')}
                    />
                    <ToggleRow
                      checked={settings.notifications.workshopReminders}
                      icon={Monitor}
                      label="Workshop reminders"
                      onChange={() => handleNotificationToggle('workshopReminders')}
                    />
                    <ToggleRow
                      checked={settings.notifications.scenarioUpdates}
                      icon={TrendingUp}
                      label="Scenario updates"
                      onChange={() => handleNotificationToggle('scenarioUpdates')}
                    />
                    <ToggleRow
                      checked={settings.notifications.swotUpdates}
                      icon={SlidersHorizontal}
                      label="SWOT updates"
                      onChange={() => handleNotificationToggle('swotUpdates')}
                    />
                    <ToggleRow
                      checked={settings.notifications.systemAnnouncements}
                      icon={ShieldCheck}
                      label="System announcements"
                      onChange={() => handleNotificationToggle('systemAnnouncements')}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'security' && (
            <section className="settings-panel">
              <div className="settings-panel-header">
                <div>
                  <h2>Security</h2>
                  <p>Update your password without leaving the workspace.</p>
                </div>
                <LockKeyhole size={22} />
              </div>

              <form className="settings-form" onSubmit={handlePasswordSubmit}>
                <label className="settings-field">
                  <span>Current Password</span>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={event =>
                      setPasswordForm(prev => ({ ...prev, currentPassword: event.target.value }))
                    }
                    autoComplete="current-password"
                  />
                </label>
                <div className="settings-form-grid">
                  <label className="settings-field">
                    <span>New Password</span>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={event =>
                        setPasswordForm(prev => ({ ...prev, newPassword: event.target.value }))
                      }
                      autoComplete="new-password"
                    />
                  </label>
                  <label className="settings-field">
                    <span>Confirm Password</span>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={event =>
                        setPasswordForm(prev => ({ ...prev, confirmPassword: event.target.value }))
                      }
                      autoComplete="new-password"
                    />
                  </label>
                </div>

                <div className="settings-submit-row">
                  <button className="btn btn-primary" type="submit" disabled={savingPassword}>
                    <ShieldCheck size={16} />
                    {savingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </section>
          )}

          {activeSection === 'workspace' && canViewAdmin && (
            <section className="settings-panel">
              <div className="settings-panel-header">
                <div>
                  <h2>Workspace Defaults</h2>
                  <p>Admin defaults for new scanning and workshop work.</p>
                </div>
                <Building2 size={22} />
              </div>

              <div className="settings-stack">
                <div className="settings-control-group">
                  <span>Default Horizon</span>
                  <OptionGrid
                    options={HORIZON_OPTIONS}
                    value={settings.workspace.defaultHorizon}
                    onChange={defaultHorizon =>
                      updateSettings(
                        prevSettings => ({
                          ...prevSettings,
                          workspace: {
                            ...prevSettings.workspace,
                            defaultHorizon,
                          },
                        }),
                        'Workspace defaults saved.',
                      )
                    }
                  />
                </div>

                <SegmentedControl
                  label="Publish Mode"
                  options={PUBLISH_OPTIONS}
                  value={settings.workspace.publishMode}
                  onChange={publishMode =>
                    updateSettings(
                      prevSettings => ({
                        ...prevSettings,
                        workspace: {
                          ...prevSettings.workspace,
                          publishMode,
                        },
                      }),
                      'Workspace defaults saved.',
                    )
                  }
                />

                <div className="settings-control-group">
                  <span>PESTEL Defaults</span>
                  <div className="settings-pestel-grid">
                    {PESTEL_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        className={
                          settings.workspace.pestelDefaults.includes(option.value) ? 'active' : ''
                        }
                        onClick={() => handlePestelToggle(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
