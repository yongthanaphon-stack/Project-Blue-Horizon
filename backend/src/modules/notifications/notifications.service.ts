import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  UserRole,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/jwt.guard';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  BroadcastNotificationDto,
  NotificationQueryDto,
  UpdateNotificationPreferencesDto,
} from './dto/notification.dto';
import { NotificationsGateway } from './notifications.gateway';

const ADMIN_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.ADMIN_SYSTEM];
const DELETED_USER_EMAIL = 'deleted-user@bluehorizon.local';

const actorSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatar: true,
} satisfies Prisma.UserSelect;

const notificationInclude = {
  actor: { select: actorSelect },
} satisfies Prisma.NotificationInclude;

const preferenceSelect = {
  userId: true,
  inAppEnabled: true,
  dailySummary: true,
  signalVotes: true,
  signalNeedsVote: true,
  workshopReminders: true,
  scenarioUpdates: true,
  swotUpdates: true,
  systemAnnouncements: true,
} satisfies Prisma.NotificationPreferenceSelect;

type NotificationRecord = Prisma.NotificationGetPayload<{
  include: typeof notificationInclude;
}>;
type PreferenceRecord = Prisma.NotificationPreferenceGetPayload<{
  select: typeof preferenceSelect;
}>;
type PreferenceFlag =
  | 'dailySummary'
  | 'signalVotes'
  | 'signalNeedsVote'
  | 'workshopReminders'
  | 'scenarioUpdates'
  | 'swotUpdates'
  | 'systemAnnouncements';

type NotificationInput = {
  userId: number;
  actorId?: number | null;
  type: NotificationType;
  title: string;
  message: string;
  href?: string | null;
  metadata?: Prisma.InputJsonValue;
};

type NotificationAudienceInput = Omit<NotificationInput, 'userId'>;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async findForUser(userId: number, query: NotificationQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const where: Prisma.NotificationWhereInput = { userId };

    if (query.status === 'archived') {
      where.archivedAt = { not: null };
    } else {
      where.archivedAt = null;

      if (query.status === 'unread') {
        where.readAt = null;
      }

      if (query.status === 'read') {
        where.readAt = { not: null };
      }
    }

    if (query.type) {
      where.type = query.type;
    }

    const [notifications, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: notificationInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.countUnread(userId),
    ]);

    return {
      data: notifications.map(notification => this.toNotification(notification)),
      meta: {
        total,
        unread,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(userId: number) {
    return { unread: await this.countUnread(userId) };
  }

  async getPreferences(userId: number) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async updatePreferences(
    userId: number,
    dto: UpdateNotificationPreferencesDto,
  ) {
    const data = this.pickPreferenceUpdates(dto);

    if (!Object.keys(data).length) {
      throw new BadRequestException('Please provide at least one preference.');
    }

    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  async createForUser(input: NotificationInput) {
    const allowedUserIds = await this.filterUserIdsByPreferences(
      [input.userId],
      input.type,
    );

    if (allowedUserIds.length === 0) return null;

    const notification = await this.prisma.notification.create({
      data: this.toCreateData(input),
      include: notificationInclude,
    });
    const mappedNotification = this.toNotification(notification);
    const unread = await this.countUnread(input.userId);

    this.notificationsGateway.emitNewNotification(
      input.userId,
      mappedNotification,
      unread,
    );

    return mappedNotification;
  }

  async createForUsers(userIds: number[], input: NotificationAudienceInput) {
    const allowedUserIds = await this.filterUserIdsByPreferences(
      userIds,
      input.type,
    );

    if (allowedUserIds.length === 0) {
      return { count: 0 };
    }

    const notifications = await this.prisma.$transaction(
      allowedUserIds.map(userId =>
        this.prisma.notification.create({
          data: this.toCreateData({ ...input, userId }),
          include: notificationInclude,
        }),
      ),
    );

    await Promise.all(
      notifications.map(async notification => {
        const mappedNotification = this.toNotification(notification);
        const unread = await this.countUnread(notification.userId);
        this.notificationsGateway.emitNewNotification(
          notification.userId,
          mappedNotification,
          unread,
        );
      }),
    );

    return {
      count: notifications.length,
      notifications: notifications.map(notification =>
        this.toNotification(notification),
      ),
    };
  }

  async markRead(id: number, userId: number) {
    await this.ensureOwnedNotification(id, userId);

    const notification = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
      include: notificationInclude,
    });

    const mappedNotification = this.toNotification(notification);
    const unread = await this.countUnread(userId);

    this.notificationsGateway.emitNotificationRead(userId, id, unread);

    return mappedNotification;
  }

  async markAllRead(userId: number) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
        archivedAt: null,
      },
      data: { readAt: new Date() },
    });

    const unread = await this.countUnread(userId);

    this.notificationsGateway.emitAllNotificationsRead(userId, unread);

    return {
      success: true,
      updated: result.count,
      unread,
    };
  }

  async archive(id: number, userId: number) {
    await this.ensureOwnedNotification(id, userId);

    const notification = await this.prisma.notification.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        readAt: new Date(),
      },
      include: notificationInclude,
    });

    const mappedNotification = this.toNotification(notification);
    const unread = await this.countUnread(userId);

    this.notificationsGateway.emitNotificationArchived(userId, id, unread);

    return mappedNotification;
  }

  async broadcast(currentUser: AuthenticatedUser, dto: BroadcastNotificationDto) {
    this.assertAdmin(currentUser);

    const title = dto.title.trim();
    const message = dto.message.trim();

    if (!title || !message) {
      throw new BadRequestException('Title and message are required.');
    }

    const where: Prisma.UserWhereInput = {
      email: { not: DELETED_USER_EMAIL },
    };

    if (dto.userIds?.length) {
      where.id = { in: [...new Set(dto.userIds)] };
    }

    if (dto.role) {
      where.role = dto.role;
    }

    const recipients = await this.prisma.user.findMany({
      where,
      select: { id: true },
    });

    return this.createForUsers(
      recipients.map(user => user.id),
      {
        actorId: currentUser.id,
        href: dto.href,
        message,
        metadata: { broadcast: true },
        title,
        type: dto.type || NotificationType.SYSTEM_ANNOUNCEMENT,
      },
    );
  }

  async notifySignalNeedsVote(
    signal: {
      id: number;
      name: string;
      ownerId?: number | null;
      isGlobal?: boolean;
      status?: string;
      workshopId?: number | null;
    },
    actorId?: number | null,
  ) {
    await this.runSafely('signal needs-vote notification', async () => {
      if (
        signal.status !== 'PUBLISHED' ||
        !signal.isGlobal ||
        signal.workshopId !== null
      ) {
        return;
      }

      const recipients = await this.getAllUserIds(actorId || signal.ownerId);
      await this.createForUsers(recipients, {
        actorId: actorId || signal.ownerId,
        href: `/signals/${signal.id}`,
        message: `${signal.name} is ready for impact scoring in the Signal Bank.`,
        metadata: { signalId: signal.id },
        title: 'New signal needs your vote',
        type: NotificationType.SIGNAL_NEEDS_VOTE,
      });
    });
  }

  async notifySignalVote(signalId: number, voterId: number, score: number) {
    await this.runSafely('signal vote notification', async () => {
      const signal = await this.prisma.signal.findUnique({
        where: { id: signalId },
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      });

      if (!signal?.ownerId || signal.ownerId === voterId) return;

      await this.createForUser({
        actorId: voterId,
        href: `/signals/${signal.id}`,
        message: `${signal.name} received a new impact score of ${score}/10.`,
        metadata: { score, signalId: signal.id },
        title: 'Your signal received a vote',
        type: NotificationType.SIGNAL_VOTE_RECEIVED,
        userId: signal.ownerId,
      });
    });
  }

  async notifyWorkshopCreated(workshopId: number, actorId?: number | null) {
    await this.runSafely('workshop created notification', async () => {
      const workshop = await this.prisma.workshop.findUnique({
        where: { id: workshopId },
        select: { id: true, name: true },
      });

      if (!workshop) return;

      const recipients = await this.getAllUserIds(actorId);
      await this.createForUsers(recipients, {
        actorId,
        href: `/workshop`,
        message: `${workshop.name} is now available in the workshop workspace.`,
        metadata: { workshopId: workshop.id },
        title: 'Workshop created',
        type: NotificationType.WORKSHOP_CREATED,
      });
    });
  }

  async notifyScenarioCreated(scenarioId: number, actorId?: number | null) {
    await this.runSafely('scenario created notification', async () => {
      const scenario = await this.prisma.scenario.findUnique({
        where: { id: scenarioId },
        select: {
          id: true,
          title: true,
          workshopId: true,
          workshop: {
            select: {
              participants: { select: { userId: true } },
            },
          },
        },
      });

      if (!scenario) return;

      const recipients = await this.getWorkshopAudience(
        scenario.workshop.participants.map(participant => participant.userId),
        actorId,
      );

      await this.createForUsers(recipients, {
        actorId,
        href: `/workshop/${scenario.workshopId}/scenarios`,
        message: `${scenario.title} is ready for review in Scenario Generation.`,
        metadata: {
          scenarioId: scenario.id,
          workshopId: scenario.workshopId,
        },
        title: 'Scenario draft ready',
        type: NotificationType.SCENARIO_CREATED,
      });
    });
  }

  async notifyScenarioSelected(
    scenarioId: number,
    workshopId: number,
    actorId?: number | null,
  ) {
    await this.runSafely('scenario selected notification', async () => {
      const scenario = await this.prisma.scenario.findUnique({
        where: { id: scenarioId },
        select: {
          id: true,
          title: true,
          workshop: {
            select: {
              participants: { select: { userId: true } },
            },
          },
        },
      });

      if (!scenario) return;

      const recipients = await this.getWorkshopAudience(
        scenario.workshop.participants.map(participant => participant.userId),
        actorId,
      );

      await this.createForUsers(recipients, {
        actorId,
        href: `/workshop/${workshopId}/scenarios/${scenarioId}/swot`,
        message: `${scenario.title} was selected for SWOT analysis.`,
        metadata: { scenarioId, workshopId },
        title: 'Scenario selected',
        type: NotificationType.SCENARIO_SELECTED,
      });
    });
  }

  async notifySwotUpdated(scenarioId: number, actorId?: number | null) {
    await this.runSafely('SWOT updated notification', async () => {
      const scenario = await this.prisma.scenario.findUnique({
        where: { id: scenarioId },
        select: {
          id: true,
          title: true,
          workshopId: true,
          workshop: {
            select: {
              participants: { select: { userId: true } },
            },
          },
        },
      });

      if (!scenario) return;

      const recipients = await this.getWorkshopAudience(
        scenario.workshop.participants.map(participant => participant.userId),
        actorId,
      );

      await this.createForUsers(recipients, {
        actorId,
        href: `/workshop/${scenario.workshopId}/scenarios/${scenario.id}/swot`,
        message: `SWOT analysis was updated for ${scenario.title}.`,
        metadata: {
          scenarioId: scenario.id,
          workshopId: scenario.workshopId,
        },
        title: 'SWOT analysis updated',
        type: NotificationType.SWOT_UPDATED,
      });
    });
  }

  private async countUnread(userId: number) {
    return this.prisma.notification.count({
      where: {
        userId,
        readAt: null,
        archivedAt: null,
      },
    });
  }

  private async ensureOwnedNotification(id: number, userId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }
  }

  private async getAllUserIds(excludeUserId?: number | null) {
    const users = await this.prisma.user.findMany({
      where: {
        email: { not: DELETED_USER_EMAIL },
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });

    return users.map(user => user.id);
  }

  private async getWorkshopAudience(
    participantUserIds: number[],
    actorId?: number | null,
  ) {
    const uniqueParticipantIds = [...new Set(participantUserIds)]
      .filter(userId => userId !== actorId);

    if (uniqueParticipantIds.length > 0) {
      return uniqueParticipantIds;
    }

    return this.getAllUserIds(actorId);
  }

  private async filterUserIdsByPreferences(
    userIds: number[],
    type: NotificationType,
  ) {
    const uniqueUserIds = [...new Set(userIds)].filter(Boolean);
    if (uniqueUserIds.length === 0) return [];

    const preferenceFlag = this.getPreferenceFlag(type);
    const preferences = await this.prisma.notificationPreference.findMany({
      where: { userId: { in: uniqueUserIds } },
      select: preferenceSelect,
    });
    const preferenceByUserId = new Map<number, PreferenceRecord>(
      preferences.map(preference => [preference.userId, preference]),
    );

    return uniqueUserIds.filter(userId => {
      const preference = preferenceByUserId.get(userId);
      if (!preference) return true;
      if (!preference.inAppEnabled) return false;
      if (!preferenceFlag) return true;
      return preference[preferenceFlag];
    });
  }

  private getPreferenceFlag(type: NotificationType): PreferenceFlag | null {
    switch (type) {
      case NotificationType.DAILY_SUMMARY:
        return 'dailySummary';
      case NotificationType.SIGNAL_VOTE_RECEIVED:
        return 'signalVotes';
      case NotificationType.SIGNAL_NEEDS_VOTE:
      case NotificationType.SIGNAL_UPDATED:
        return 'signalNeedsVote';
      case NotificationType.WORKSHOP_CREATED:
      case NotificationType.WORKSHOP_REMINDER:
        return 'workshopReminders';
      case NotificationType.SCENARIO_CREATED:
      case NotificationType.SCENARIO_SELECTED:
        return 'scenarioUpdates';
      case NotificationType.SWOT_UPDATED:
        return 'swotUpdates';
      case NotificationType.SYSTEM_ANNOUNCEMENT:
        return 'systemAnnouncements';
      default:
        return null;
    }
  }

  private pickPreferenceUpdates(dto: UpdateNotificationPreferencesDto) {
    const keys = [
      'inAppEnabled',
      'emailEnabled',
      'dailySummary',
      'signalVotes',
      'signalNeedsVote',
      'workshopReminders',
      'scenarioUpdates',
      'swotUpdates',
      'systemAnnouncements',
    ] as const;

    return keys.reduce(
      (updates, key) => {
        if (dto[key] !== undefined) {
          updates[key] = dto[key];
        }
        return updates;
      },
      {} as Partial<Record<(typeof keys)[number], boolean>>,
    );
  }

  private toCreateData(input: NotificationInput): Prisma.NotificationCreateInput {
    return {
      type: input.type,
      title: input.title,
      message: input.message,
      href: input.href,
      metadata: input.metadata,
      user: { connect: { id: input.userId } },
      ...(input.actorId ? { actor: { connect: { id: input.actorId } } } : {}),
    };
  }

  private toNotification(notification: NotificationRecord) {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      href: notification.href,
      metadata: notification.metadata,
      readAt: notification.readAt,
      archivedAt: notification.archivedAt,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      actor: notification.actor,
      isUnread: !notification.readAt && !notification.archivedAt,
    };
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (!ADMIN_ROLES.includes(user.role as UserRole)) {
      throw new ForbiddenException('Administrator access is required.');
    }
  }

  private async runSafely(label: string, operation: () => Promise<void>) {
    try {
      await operation();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to create ${label}: ${message}`);
    }
  }
}
