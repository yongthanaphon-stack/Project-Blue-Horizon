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
import {
  PresenceService,
  PresenceUser,
  SwotActivityMode,
} from '../../core/presence/presence.service';
import { PrismaService } from '../../core/prisma/prisma.service';
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

type WorkshopPresencePayload = {
  workshopId?: number | string;
  workshopIds?: Array<number | string>;
};

type SwotPresencePayload = {
  scenarioId?: number | string;
};

type SwotActivityPayload = SwotPresencePayload & {
  quadrant?: string;
  mode?: SwotActivityMode;
  itemIndex?: number | string | null;
};

const SWOT_QUADRANTS = new Set([
  'strengths',
  'weaknesses',
  'opportunities',
  'threats',
]);

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
    private readonly prisma: PrismaService,
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

    const affectedRooms = this.presence.leaveCollaborativeRooms(client.id, user.id);
    this.presence.disconnect(user.id, client.id);
    this.broadcastPresence();
    affectedRooms.workshopIds.forEach(workshopId => this.emitWorkshopPresence(workshopId));
    affectedRooms.swotScenarioIds.forEach(scenarioId => {
      this.emitSwotPresence(scenarioId);
      this.emitSwotActivity(scenarioId);
    });
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

  @SubscribeMessage('workshop:watch')
  async handleWorkshopWatch(
    @ConnectedSocket() client: AuthenticatedSocket,
    payload: WorkshopPresencePayload,
  ) {
    const user = this.getAuthenticatedUser(client);
    if (!user) return;

    const workshopIds = this.parseWorkshopIds(payload?.workshopIds);

    await Promise.all(workshopIds.map(async workshopId => {
      try {
        await this.assertWorkshopAccess(workshopId, user);
        await client.join(this.getWorkshopRoom(workshopId));
        client.emit('workshop:presence', {
          workshopId,
          users: this.presence.getWorkshopUsers(workshopId),
        });
      } catch {
        client.emit('collaboration:error', {
          message: 'You do not have access to this workshop session.',
        });
      }
    }));
  }

  @SubscribeMessage('workshop:unwatch')
  async handleWorkshopUnwatch(
    @ConnectedSocket() client: AuthenticatedSocket,
    payload: WorkshopPresencePayload,
  ) {
    const workshopIds = this.parseWorkshopIds(payload?.workshopIds);
    await Promise.all(workshopIds.map(workshopId => (
      client.leave(this.getWorkshopRoom(workshopId))
    )));
  }

  @SubscribeMessage('workshop:join')
  async handleWorkshopJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    payload: WorkshopPresencePayload,
  ) {
    const user = this.getAuthenticatedUser(client);
    if (!user) return;

    try {
      const workshopId = this.parsePositiveInt(payload?.workshopId);
      await this.assertWorkshopAccess(workshopId, user);
      this.presence.joinWorkshop(workshopId, this.toPresenceUser(user), client.id);
      await client.join(this.getWorkshopRoom(workshopId));
      this.emitWorkshopPresence(workshopId);
    } catch {
      client.emit('collaboration:error', {
        message: 'You do not have access to this workshop session.',
      });
    }
  }

  @SubscribeMessage('workshop:leave')
  async handleWorkshopLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    payload: WorkshopPresencePayload,
  ) {
    const user = this.getAuthenticatedUser(client);
    if (!user) return;

    try {
      const workshopId = this.parsePositiveInt(payload?.workshopId);
      this.presence.leaveWorkshop(workshopId, user.id, client.id);
      await client.leave(this.getWorkshopRoom(workshopId));
      this.emitWorkshopPresence(workshopId);
    } catch {
      client.emit('collaboration:error', { message: 'Unable to leave workshop session.' });
    }
  }

  @SubscribeMessage('swot:join')
  async handleSwotJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    payload: SwotPresencePayload,
  ) {
    const user = this.getAuthenticatedUser(client);
    if (!user) return;

    try {
      const scenarioId = this.parsePositiveInt(payload?.scenarioId);
      await this.assertScenarioAccess(scenarioId, user);
      this.presence.joinSwotScenario(scenarioId, this.toPresenceUser(user), client.id);
      await client.join(this.getSwotRoom(scenarioId));
      this.emitSwotPresence(scenarioId);
      this.emitSwotActivity(scenarioId);
    } catch {
      client.emit('collaboration:error', {
        message: 'You do not have access to this SWOT analysis.',
      });
    }
  }

  @SubscribeMessage('swot:leave')
  async handleSwotLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    payload: SwotPresencePayload,
  ) {
    const user = this.getAuthenticatedUser(client);
    if (!user) return;

    try {
      const scenarioId = this.parsePositiveInt(payload?.scenarioId);
      this.presence.leaveSwotScenario(scenarioId, user.id, client.id);
      await client.leave(this.getSwotRoom(scenarioId));
      this.emitSwotPresence(scenarioId);
      this.emitSwotActivity(scenarioId);
    } catch {
      client.emit('collaboration:error', { message: 'Unable to leave SWOT analysis.' });
    }
  }

  @SubscribeMessage('swot:activity:start')
  async handleSwotActivityStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    payload: SwotActivityPayload,
  ) {
    const user = this.getAuthenticatedUser(client);
    if (!user) return;

    try {
      const scenarioId = this.parsePositiveInt(payload?.scenarioId);
      const quadrant = this.parseSwotQuadrant(payload?.quadrant);
      const itemIndex = this.parseOptionalIndex(payload?.itemIndex);
      const mode: SwotActivityMode = payload?.mode === 'editing' ? 'editing' : 'typing';

      if (!this.presence.isUserInSwotScenario(scenarioId, user.id)) {
        await this.assertScenarioAccess(scenarioId, user);
        this.presence.joinSwotScenario(scenarioId, this.toPresenceUser(user), client.id);
        await client.join(this.getSwotRoom(scenarioId));
        this.emitSwotPresence(scenarioId);
      }

      this.presence.setSwotActivity(scenarioId, {
        ...this.toPresenceUser(user),
        userId: user.id,
        quadrant,
        mode,
        itemIndex,
        updatedAt: Date.now(),
      });
      this.emitSwotActivity(scenarioId);
    } catch {
      client.emit('collaboration:error', { message: 'Unable to update SWOT activity.' });
    }
  }

  @SubscribeMessage('swot:activity:stop')
  handleSwotActivityStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    payload: SwotPresencePayload,
  ) {
    const user = this.getAuthenticatedUser(client);
    if (!user) return;

    try {
      const scenarioId = this.parsePositiveInt(payload?.scenarioId);
      this.presence.clearSwotActivity(scenarioId, user.id);
      this.emitSwotActivity(scenarioId);
    } catch {
      client.emit('collaboration:error', { message: 'Unable to clear SWOT activity.' });
    }
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

  private getWorkshopRoom(workshopId: number) {
    return `workshop:${workshopId}`;
  }

  private getSwotRoom(scenarioId: number) {
    return `swot:${scenarioId}`;
  }

  private broadcastPresence() {
    this.server.emit('users:presence', {
      onlineUserIds: this.presence.getOnlineUserIds(),
    });
  }

  private emitWorkshopPresence(workshopId: number) {
    this.server.to(this.getWorkshopRoom(workshopId)).emit('workshop:presence', {
      workshopId,
      users: this.presence.getWorkshopUsers(workshopId),
    });
  }

  private emitSwotPresence(scenarioId: number) {
    this.server.to(this.getSwotRoom(scenarioId)).emit('swot:presence', {
      scenarioId,
      users: this.presence.getSwotUsers(scenarioId),
    });
  }

  private emitSwotActivity(scenarioId: number) {
    this.server.to(this.getSwotRoom(scenarioId)).emit('swot:activity', {
      scenarioId,
      activities: this.presence.getSwotActivities(scenarioId),
    });
  }

  private getAuthenticatedUser(client: AuthenticatedSocket) {
    const user = client.data.user;
    if (!user) {
      client.emit('collaboration:error', { message: 'Unauthorized socket connection.' });
    }

    return user;
  }

  private toPresenceUser(user: AuthenticatedUser): PresenceUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    };
  }

  private parsePositiveInt(value: number | string | undefined) {
    const numericValue = Number(value);
    if (!Number.isInteger(numericValue) || numericValue <= 0) {
      throw new Error('Invalid identifier');
    }

    return numericValue;
  }

  private parseWorkshopIds(value: Array<number | string> | undefined) {
    if (!Array.isArray(value)) return [];

    const workshopIds = value
      .map(item => Number(item))
      .filter(item => Number.isInteger(item) && item > 0);

    return Array.from(new Set(workshopIds)).slice(0, 50);
  }

  private parseSwotQuadrant(value: string | undefined) {
    if (!value || !SWOT_QUADRANTS.has(value)) {
      throw new Error('Invalid SWOT quadrant');
    }

    return value;
  }

  private parseOptionalIndex(value: number | string | null | undefined) {
    if (value === null || value === undefined || value === '') return null;

    const numericValue = Number(value);
    if (!Number.isInteger(numericValue) || numericValue < 0) {
      return null;
    }

    return numericValue;
  }

  private isAdminRole(role?: string | null) {
    return role === 'ADMIN' || role === 'ADMIN_SYSTEM';
  }

  private async assertWorkshopAccess(workshopId: number, user: AuthenticatedUser) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
      select: {
        id: true,
        participants: {
          where: { userId: user.id },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!workshop || (!this.isAdminRole(user.role) && !workshop.participants.length)) {
      throw new Error('Forbidden workshop room');
    }
  }

  private async assertScenarioAccess(scenarioId: number, user: AuthenticatedUser) {
    const scenario = await this.prisma.scenario.findUnique({
      where: { id: scenarioId },
      select: {
        id: true,
        workshop: {
          select: {
            participants: {
              where: { userId: user.id },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!scenario || (!this.isAdminRole(user.role) && !scenario.workshop.participants.length)) {
      throw new Error('Forbidden SWOT room');
    }
  }
}
