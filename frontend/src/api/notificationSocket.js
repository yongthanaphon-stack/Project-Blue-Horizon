import { io } from 'socket.io-client';
import { getAuthToken } from '../utils/authStorage';

const NOTIFICATION_SOCKET_URL = 'http://localhost:3001/notifications';

export function connectNotificationSocket(handlers = {}) {
  const token = getAuthToken();
  if (!token) return null;

  const socket = io(NOTIFICATION_SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    withCredentials: true,
  });

  socket.on('notifications:connected', handlers.onConnected || (() => {}));
  socket.on('notifications:error', handlers.onError || (() => {}));
  socket.on('notification:new', handlers.onNewNotification || (() => {}));
  socket.on('notification:read', handlers.onNotificationRead || (() => {}));
  socket.on('notifications:read-all', handlers.onAllNotificationsRead || (() => {}));
  socket.on('notification:archived', handlers.onNotificationArchived || (() => {}));
  socket.on('users:presence', handlers.onPresenceUpdate || (() => {}));
  socket.on('workshop:presence', handlers.onWorkshopPresence || (() => {}));
  socket.on('swot:presence', handlers.onSwotPresence || (() => {}));
  socket.on('swot:activity', handlers.onSwotActivity || (() => {}));
  socket.on('collaboration:error', handlers.onCollaborationError || (() => {}));
  socket.on('connect_error', handlers.onConnectError || (() => {}));
  socket.on('disconnect', handlers.onDisconnected || (() => {}));

  return socket;
}
