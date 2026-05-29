import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../auth/jwt.guard';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  FONT_PREFERENCES,
  UpdateProfileDto,
  UpdateProfilePreferencesDto,
} from './dto/profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async getProfile(userId: number) {
    const user = await this.findUserOrThrow(userId);
    const [stats, activity] = await Promise.all([
      this.getProfileStats(userId, user.passwordHash),
      this.getRecentActivity(userId),
    ]);

    return {
      success: true,
      user: this.toProfileUser(user),
      stats,
      activity,
    };
  }

  async updateProfile(currentUser: AuthenticatedUser, dto: UpdateProfileDto) {
    const user = await this.findUserOrThrow(currentUser.id);
    const data: { name?: string; email?: string; passwordHash?: string } = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new BadRequestException('Full name is required.');
      }
      data.name = name;
    }

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      await this.ensureEmailIsAvailable(email, currentUser.id);
      data.email = email;
    }

    if (dto.newPassword || dto.confirmPassword || dto.currentPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required.');
      }

      if (!dto.newPassword || !dto.confirmPassword) {
        throw new BadRequestException(
          'New password and confirmation are required.',
        );
      }

      if (dto.newPassword !== dto.confirmPassword) {
        throw new BadRequestException(
          'New password and confirmation do not match.',
        );
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        dto.currentPassword,
        user.passwordHash,
      );

      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect.');
      }

      data.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    }

    if (!Object.keys(data).length) {
      throw new BadRequestException(
        'Please provide at least one field to update.',
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: currentUser.id },
      data,
    });

    const authResponse = this.authService.createAuthResponse(updatedUser);

    return {
      success: true,
      message: 'Profile updated successfully.',
      ...authResponse,
      user: this.toProfileUser(updatedUser),
    };
  }

  async updatePreferences(
    currentUser: AuthenticatedUser,
    dto: UpdateProfilePreferencesDto,
  ) {
    const data: { preferredFont?: string } = {};

    if (dto.preferredFont !== undefined) {
      const preferredFont = dto.preferredFont.trim();
      if (
        !FONT_PREFERENCES.includes(
          preferredFont as (typeof FONT_PREFERENCES)[number],
        )
      ) {
        throw new BadRequestException('Unsupported font preference.');
      }
      data.preferredFont = preferredFont;
    }

    if (!Object.keys(data).length) {
      throw new BadRequestException(
        'Please provide at least one preference to update.',
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: currentUser.id },
      data,
    });

    return {
      success: true,
      message: 'Preferences updated successfully.',
      ...this.authService.createAuthResponse(updatedUser),
    };
  }

  private toProfileUser(user: {
    id: number;
    name: string;
    email: string;
    role: string;
    avatar?: string | null;
    preferredFont?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      ...this.authService.toAuthUser(user),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private async getProfileStats(userId: number, passwordHash: string) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [signals, signalsThisMonth, workshops, votes] = await Promise.all([
      this.prisma.signal.count({
        where: { ownerId: userId, deletedAt: null },
      }),
      this.prisma.signal.count({
        where: {
          ownerId: userId,
          deletedAt: null,
          createdAt: { gte: monthStart },
        },
      }),
      this.prisma.workshopParticipant.count({
        where: { userId, workshop: { isActive: true } },
      }),
      this.prisma.signalVote.count({
        where: { userId },
      }),
    ]);

    return {
      signals,
      signalsThisMonth,
      workshops,
      votes,
      securityLabel: passwordHash ? 'Protected' : 'Setup required',
    };
  }

  private async getRecentActivity(userId: number) {
    const [notifications, ownedSignals, votes] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, archivedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          title: true,
          createdAt: true,
        },
      }),
      this.prisma.signal.findMany({
        where: { ownerId: userId, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          name: true,
          updatedAt: true,
        },
      }),
      this.prisma.signalVote.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          createdAt: true,
          signal: {
            select: { name: true },
          },
        },
      }),
    ]);

    const activity = [
      ...notifications.map((item) => ({
        kind: 'notification' as const,
        title: item.title,
        occurredAt: item.createdAt.toISOString(),
      })),
      ...ownedSignals.map((item) => ({
        kind: 'signal' as const,
        title: `Updated signal "${item.name}"`,
        occurredAt: item.updatedAt.toISOString(),
      })),
      ...votes.map((item) => ({
        kind: 'vote' as const,
        title: `Voted on "${item.signal.name}"`,
        occurredAt: item.createdAt.toISOString(),
      })),
    ];

    return activity
      .sort(
        (left, right) =>
          new Date(right.occurredAt).getTime() -
          new Date(left.occurredAt).getTime(),
      )
      .slice(0, 5);
  }

  private async findUserOrThrow(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  private async ensureEmailIsAvailable(email: string, currentUserId: number) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.id !== currentUserId) {
      throw new ConflictException('This email is already in use.');
    }
  }
}
