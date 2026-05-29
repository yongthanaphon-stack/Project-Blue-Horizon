import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthenticatedUser } from '../auth/jwt.guard';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  AdminUserQueryDto,
  CreateAdminUserDto,
  UpdateAdminUserDto,
} from './dto/admin-user.dto';

const ADMIN_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.ADMIN_SYSTEM];
const DELETED_USER_EMAIL = 'deleted-user@bluehorizon.local';

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatar: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      ownedSignals: true,
      votes: true,
      workshopParticipations: true,
    },
  },
} satisfies Prisma.UserSelect;

type AdminUserRecord = Prisma.UserGetPayload<{ select: typeof userSelect }>;

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(currentUser: AuthenticatedUser, query: AdminUserQueryDto) {
    this.assertAdmin(currentUser);

    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      email: { not: DELETED_USER_EMAIL },
    };

    if (query.role) {
      where.role = query.role;
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [users, totalUsers, roleGroups] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
        select: userSelect,
      }),
      this.prisma.user.count({
        where: { email: { not: DELETED_USER_EMAIL } },
      }),
      this.prisma.user.groupBy({
        by: ['role'],
        where: { email: { not: DELETED_USER_EMAIL } },
        _count: { role: true },
      }),
    ]);

    return {
      users: users.map((user) => this.toAdminUser(user)),
      meta: {
        total: totalUsers,
        filtered: users.length,
        roles: roleGroups.reduce(
          (acc, group) => ({
            ...acc,
            [group.role]: group._count.role,
          }),
          {} as Record<UserRole, number>,
        ),
      },
    };
  }

  async delete(id: number, currentUser: AuthenticatedUser) {
    this.assertAdmin(currentUser);

    if (currentUser.id === id) {
      throw new BadRequestException('You cannot delete your own account.');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!existingUser || existingUser.email === DELETED_USER_EMAIL) {
      throw new NotFoundException('User not found.');
    }

    this.assertCanEditUser(currentUser, existingUser);

    if (this.isAdminRole(existingUser.role)) {
      await this.ensureAnotherAdminExists(id);
    }

    await this.prisma.$transaction(async (tx) => {
      const deletedUser = await tx.user.upsert({
        where: { email: DELETED_USER_EMAIL },
        update: {},
        create: {
          name: 'Deleted User',
          email: DELETED_USER_EMAIL,
          passwordHash: '',
          role: UserRole.ANALYST,
        },
        select: { id: true },
      });

      const votedSignals = await tx.signalVote.findMany({
        where: { userId: id },
        select: { signalId: true },
      });
      const votedSignalIds = [
        ...new Set(votedSignals.map((vote) => vote.signalId)),
      ];

      await tx.signal.updateMany({
        where: { ownerId: id },
        data: { ownerId: null },
      });

      await tx.signalHistory.updateMany({
        where: { userId: id },
        data: { userId: deletedUser.id },
      });

      await tx.signalVote.deleteMany({ where: { userId: id } });
      await tx.workshopParticipant.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });

      await Promise.all(
        votedSignalIds.map(async (signalId) => {
          const result = await tx.signalVote.aggregate({
            where: { signalId },
            _avg: { score: true },
            _count: { score: true },
          });

          await tx.signal.update({
            where: { id: signalId },
            data: {
              impactScore: result._avg.score || 0,
              totalVotes: result._count.score,
            },
          });
        }),
      );
    });

    return {
      success: true,
      message: 'User deleted successfully.',
    };
  }

  async create(currentUser: AuthenticatedUser, dto: CreateAdminUserDto) {
    this.assertAdmin(currentUser);
    this.assertCanAssignRole(currentUser, dto.role);

    const email = dto.email.trim().toLowerCase();
    await this.ensureEmailIsAvailable(email);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: this.normalizeName(dto.name),
        email,
        passwordHash,
        role: dto.role || UserRole.ANALYST,
      },
      select: userSelect,
    });

    return {
      success: true,
      message: 'User created successfully.',
      user: this.toAdminUser(user),
    };
  }

  async update(
    id: number,
    currentUser: AuthenticatedUser,
    dto: UpdateAdminUserDto,
  ) {
    this.assertAdmin(currentUser);

    const existingUser = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!existingUser) {
      throw new NotFoundException('User not found.');
    }

    this.assertCanEditUser(currentUser, existingUser);
    this.assertCanAssignRole(currentUser, dto.role);

    const data: Prisma.UserUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = this.normalizeName(dto.name);
    }

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      await this.ensureEmailIsAvailable(email, id);
      data.email = email;
    }

    if (dto.role !== undefined) {
      if (currentUser.id === id && dto.role !== existingUser.role) {
        throw new BadRequestException('You cannot change your own role.');
      }

      if (this.isAdminRole(existingUser.role) && !this.isAdminRole(dto.role)) {
        await this.ensureAnotherAdminExists(id);
      }

      data.role = dto.role;
    }

    if (!Object.keys(data).length) {
      throw new BadRequestException(
        'Please provide at least one field to update.',
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });

    return {
      success: true,
      message: 'User updated successfully.',
      user: this.toAdminUser(updatedUser),
    };
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (!this.isAdminRole(user.role)) {
      throw new ForbiddenException('Administrator access is required.');
    }
  }

  private assertCanAssignRole(currentUser: AuthenticatedUser, role?: UserRole) {
    if (
      role === UserRole.ADMIN_SYSTEM &&
      currentUser.role !== UserRole.ADMIN_SYSTEM
    ) {
      throw new ForbiddenException(
        'Only system administrators can assign system administrator access.',
      );
    }
  }

  private assertCanEditUser(
    currentUser: AuthenticatedUser,
    targetUser: AdminUserRecord,
  ) {
    if (
      targetUser.role === UserRole.ADMIN_SYSTEM &&
      currentUser.role !== UserRole.ADMIN_SYSTEM &&
      currentUser.id !== targetUser.id
    ) {
      throw new ForbiddenException(
        'Only system administrators can edit system administrators.',
      );
    }
  }

  private async ensureAnotherAdminExists(targetUserId: number) {
    const adminCount = await this.prisma.user.count({
      where: {
        id: { not: targetUserId },
        role: { in: ADMIN_ROLES },
      },
    });

    if (adminCount === 0) {
      throw new BadRequestException('At least one administrator must remain.');
    }
  }

  private async ensureEmailIsAvailable(email: string, currentUserId?: number) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser && existingUser.id !== currentUserId) {
      throw new ConflictException('This email is already in use.');
    }
  }

  private isAdminRole(role?: string | null) {
    return ADMIN_ROLES.includes(role as UserRole);
  }

  private normalizeName(name: string) {
    const normalized = name.trim();
    if (!normalized) {
      throw new BadRequestException('Full name is required.');
    }
    return normalized;
  }

  private toAdminUser(user: AdminUserRecord) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      counts: {
        signals: user._count.ownedSignals,
        votes: user._count.votes,
        workshops: user._count.workshopParticipations,
      },
    };
  }
}
