import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PresenceService } from '../../core/presence/presence.service';
import { AuthenticatedUser } from '../auth/jwt.guard';

type JwtPayload = {
  user: AuthenticatedUser;
};

type NotificationPayload = {
  id: number;
  type: string;
  title: string;
  message: string;
  href: string | null;
  metadata: unknown;
  readAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  actor: unknown;
  isUnread: boolean;
};

type AuthenticatedSocket = Socket & {
  data: {
    user?: AuthenticatedUser;
  };
};

@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly presence: PresenceService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: process.env.AUTH_SECRET || 'blue-horizon-dev-secret',
      });

      client.data.user = payload.user;
      this.presence.connect(payload.user.id, client.id);
      await client.join(this.getUserRoom(payload.user.id));
      client.emit('notifications:connected', {
        userId: payload.user.id,
        onlineUserIds: this.presence.getOnlineUserIds(),
      });
      this.broadcastPresence();
    } catch {
      client.emit('notifications:error', { message: 'Unauthorized socket connection.' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data.user;
    if (!user) return;

    this.presence.disconnect(user.id, client.id);
    this.broadcastPresence();
  }

  @SubscribeMessage('notifications:ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    return {
      event: 'notifications:pong',
      data: {
        connected: Boolean(client.data.user),
        userId: client.data.user?.id,
      },
    };
  }

  emitNewNotification(
    userId: number,
    notification: NotificationPayload,
    unread: number,
  ) {
    this.server.to(this.getUserRoom(userId)).emit('notification:new', {
      notification,
      unread,
    });
  }

  emitNotificationRead(userId: number, notificationId: number, unread: number) {
    this.server.to(this.getUserRoom(userId)).emit('notification:read', {
      notificationId,
      unread,
    });
  }

  emitAllNotificationsRead(userId: number, unread: number) {
    this.server.to(this.getUserRoom(userId)).emit('notifications:read-all', {
      unread,
    });
  }

  emitNotificationArchived(userId: number, notificationId: number, unread: number) {
    this.server.to(this.getUserRoom(userId)).emit('notification:archived', {
      notificationId,
      unread,
    });
  }

  private extractToken(client: Socket) {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken;
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string') {
      const [type, token] = header.split(' ');
      if (type === 'Bearer' && token) {
        return token;
      }
    }

    throw new Error('Missing token');
  }

  private getUserRoom(userId: number) {
    return `user:${userId}`;
  }

  private broadcastPresence() {
    this.server.emit('users:presence', {
      onlineUserIds: this.presence.getOnlineUserIds(),
    });
  }
}
