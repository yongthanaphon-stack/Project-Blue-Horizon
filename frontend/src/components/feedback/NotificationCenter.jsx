import { Archive, Bell, Check, Clock, Database, Settings, TrendingUp, Users } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../../api/api';
import { connectNotificationSocket } from '../../api/notificationSocket';
import { timeAgo } from '../../utils/date';

const POLL_INTERVAL_MS = 60000;

const NOTIFICATION_DETAILS = {
  DAILY_SUMMARY: {
    category: 'Daily Brief',
    icon: Clock,
    tone: 'summary',
  },
  SCENARIO_CREATED: {
    category: 'Scenario Generation',
    icon: TrendingUp,
    tone: 'scenario',
  },
  SCENARIO_SELECTED: {
    category: 'Scenario Generation',
    icon: TrendingUp,
    tone: 'scenario',
  },
  SIGNAL_NEEDS_VOTE: {
    category: 'Signal Bank',
    icon: Database,
    tone: 'signal',
  },
  SIGNAL_UPDATED: {
    category: 'Signal Bank',
    icon: Database,
    tone: 'signal',
  },
  SIGNAL_VOTE_RECEIVED: {
    category: 'Signal Bank',
    icon: Database,
    tone: 'signal',
  },
  SWOT_UPDATED: {
    category: 'SWOT Analysis',
    icon: TrendingUp,
    tone: 'scenario',
  },
  SYSTEM_ANNOUNCEMENT: {
    category: 'System',
    icon: Bell,
    tone: 'system',
  },
  WORKSHOP_CREATED: {
    category: 'Workshop',
    icon: Users,
    tone: 'workshop',
  },
  WORKSHOP_REMINDER: {
    category: 'Workshop',
    icon: Users,
    tone: 'workshop',
  },
};

const DEFAULT_DETAILS = {
  category: 'Workspace',
  icon: Bell,
  tone: 'system',
};

function getNotificationDetails(type) {
  return NOTIFICATION_DETAILS[type] || DEFAULT_DETAILS;
}

function mergeIncomingNotification(currentNotifications, incomingNotification) {
  return [
    incomingNotification,
    ...currentNotifications.filter(notification => notification.id !== incomingNotification.id),
  ].slice(0, 8);
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  const loadNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const response = await notificationsApi.getAll({ limit: 8, status: 'all' });
      const nextNotifications = response.data?.data || [];
      setNotifications(nextNotifications);
      setUnreadCount(
        response.data?.meta?.unread ??
        nextNotifications.filter(notification => notification.isUnread).length
      );
      setError('');
    } catch {
      setError('Unable to load notifications.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialTimerId = window.setTimeout(() => {
      loadNotifications(true);
    }, 0);
    const timerId = window.setInterval(() => {
      loadNotifications(false);
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearTimeout(initialTimerId);
      window.clearInterval(timerId);
    };
  }, [loadNotifications]);

  useEffect(() => {
    const socket = connectNotificationSocket({
      onAllNotificationsRead: ({ unread }) => {
        setNotifications(currentNotifications =>
          currentNotifications.map(notification => ({
            ...notification,
            isUnread: false,
            readAt: notification.readAt || new Date().toISOString(),
          }))
        );
        setUnreadCount(unread ?? 0);
      },
      onConnected: () => {
        setIsRealtimeConnected(true);
        setError('');
      },
      onConnectError: () => {
        setIsRealtimeConnected(false);
      },
      onDisconnected: () => {
        setIsRealtimeConnected(false);
      },
      onError: () => {
        setIsRealtimeConnected(false);
      },
      onNewNotification: ({ notification, unread }) => {
        if (!notification) return;

        setNotifications(currentNotifications =>
          mergeIncomingNotification(currentNotifications, notification)
        );
        setUnreadCount(currentCount =>
          typeof unread === 'number'
            ? unread
            : currentCount + (notification.isUnread ? 1 : 0)
        );
        setError('');
        setIsLoading(false);
      },
      onNotificationArchived: ({ notificationId, unread }) => {
        setNotifications(currentNotifications =>
          currentNotifications.filter(notification => notification.id !== notificationId)
        );
        setUnreadCount(currentCount =>
          typeof unread === 'number' ? unread : Math.max(0, currentCount - 1)
        );
      },
      onNotificationRead: ({ notificationId, unread }) => {
        setNotifications(currentNotifications =>
          currentNotifications.map(notification =>
            notification.id === notificationId
              ? {
                  ...notification,
                  isUnread: false,
                  readAt: notification.readAt || new Date().toISOString(),
                }
              : notification
          )
        );
        setUnreadCount(currentCount =>
          typeof unread === 'number' ? unread : Math.max(0, currentCount - 1)
        );
      },
    });

    return () => {
      socket?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const timerId = window.setTimeout(() => {
      loadNotifications(false);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [isOpen, loadNotifications]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event) {
      const target = event.target;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setIsOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  async function markAllRead() {
    if (unreadCount === 0) return;

    const now = new Date().toISOString();
    setNotifications(currentNotifications =>
      currentNotifications.map(notification => ({
        ...notification,
        isUnread: false,
        readAt: notification.readAt || now,
      }))
    );
    setUnreadCount(0);

    try {
      await notificationsApi.markAllRead();
    } catch {
      await loadNotifications(false);
    }
  }

  async function openNotification(notification) {
    if (notification.isUnread) {
      const now = new Date().toISOString();
      setNotifications(currentNotifications =>
        currentNotifications.map(currentNotification =>
          currentNotification.id === notification.id
            ? { ...currentNotification, isUnread: false, readAt: now }
            : currentNotification
        )
      );
      setUnreadCount(currentCount => Math.max(0, currentCount - 1));

      try {
        await notificationsApi.markRead(notification.id);
      } catch {
        await loadNotifications(false);
      }
    }

    setIsOpen(false);
    if (notification.href) {
      navigate(notification.href);
    }
  }

  async function archiveNotification(event, notification) {
    event.stopPropagation();
    setNotifications(currentNotifications =>
      currentNotifications.filter(currentNotification => currentNotification.id !== notification.id)
    );
    if (notification.isUnread) {
      setUnreadCount(currentCount => Math.max(0, currentCount - 1));
    }

    try {
      await notificationsApi.archive(notification.id);
    } catch {
      await loadNotifications(false);
    }
  }

  return (
    <div className="notification-center">
      <button
        ref={buttonRef}
        type="button"
        className={`topbar-icon-btn notification-trigger ${isOpen ? 'active' : ''}`}
        id="notifications-btn"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls="notification-center-panel"
        onClick={() => setIsOpen(current => !current)}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge" aria-hidden="true">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          ref={panelRef}
          className="notification-panel"
          id="notification-center-panel"
          aria-label="Notifications"
        >
          <div className="notification-panel-header">
            <div>
              <h2>Notifications</h2>
              <p>
                {unreadCount ? `${unreadCount} unread updates` : 'All caught up'}
                <span className={isRealtimeConnected ? 'realtime-dot live' : 'realtime-dot'} aria-hidden="true" />
              </p>
            </div>
            <button type="button" onClick={markAllRead} disabled={unreadCount === 0}>
              <Check size={15} />
              Mark read
            </button>
          </div>

          <div className="notification-list">
            {isLoading && (
              <div className="notification-empty-state">
                <Clock size={22} />
                <span>Loading notifications...</span>
              </div>
            )}

            {!isLoading && error && (
              <div className="notification-empty-state notification-empty-state-error">
                <Bell size={22} />
                <span>{error}</span>
                <button type="button" onClick={() => loadNotifications(true)}>
                  Retry
                </button>
              </div>
            )}

            {!isLoading && !error && notifications.length === 0 && (
              <div className="notification-empty-state">
                <Check size={22} />
                <span>All caught up.</span>
              </div>
            )}

            {!isLoading && !error && notifications.map(notification => {
              const details = getNotificationDetails(notification.type);
              const Icon = details.icon;

              return (
                <article
                  key={notification.id}
                  className={`notification-item notification-item-${details.tone} ${notification.isUnread ? 'unread' : ''}`}
                >
                  <button
                    type="button"
                    className="notification-item-main"
                    onClick={() => openNotification(notification)}
                  >
                    <span className="notification-item-icon" aria-hidden="true">
                      <Icon size={17} />
                    </span>
                    <span className="notification-item-copy">
                      <span className="notification-item-meta">
                        <span>{details.category}</span>
                        <time dateTime={notification.createdAt}>{timeAgo(notification.createdAt)}</time>
                      </span>
                      <strong>{notification.title}</strong>
                      <span>{notification.message}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="notification-item-action"
                    aria-label="Archive notification"
                    title="Archive"
                    onClick={(event) => archiveNotification(event, notification)}
                  >
                    <Archive size={15} />
                  </button>
                </article>
              );
            })}
          </div>

          <button
            type="button"
            className="notification-settings-link"
            onClick={() => {
              setIsOpen(false);
              navigate('/settings');
            }}
          >
            <Settings size={16} />
            Notification preferences
          </button>
        </section>
      )}
    </div>
  );
}
