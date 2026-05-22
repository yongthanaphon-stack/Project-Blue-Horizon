import { Injectable } from '@nestjs/common';
import { PresenceService } from '../../core/presence/presence.service';
import { PrismaService } from '../../core/prisma/prisma.service';

const DELETED_USER_EMAIL = 'deleted-user@bluehorizon.local';

@Injectable()
export class UsersService {
  constructor(
    private readonly presence: PresenceService,
    private readonly prisma: PrismaService,
  ) {}

  async getDirectory() {
    const users = await this.prisma.user.findMany({
      where: {
        email: { not: DELETED_USER_EMAIL },
        passwordHash: { not: '' },
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        updatedAt: true,
      },
    });

    return {
      users: users.map(user => ({
        ...user,
        online: this.presence.isOnline(user.id),
        updatedAt: user.updatedAt.toISOString(),
      })),
    };
  }
}
