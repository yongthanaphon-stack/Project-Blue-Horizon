import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/jwt.guard';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AdminUsersService } from './admin-users.service';

const createdAt = new Date('2026-01-01T00:00:00.000Z');
const updatedAt = new Date('2026-01-02T00:00:00.000Z');

const adminUser: AuthenticatedUser = {
  id: 1,
  name: 'Admin User',
  email: 'admin@example.com',
  role: UserRole.ADMIN,
};

const systemAdminUser: AuthenticatedUser = {
  id: 2,
  name: 'System Admin',
  email: 'system@example.com',
  role: UserRole.ADMIN_SYSTEM,
};

const analystUser: AuthenticatedUser = {
  id: 3,
  name: 'Analyst User',
  email: 'analyst@example.com',
  role: UserRole.ANALYST,
};

function createUserRecord(overrides = {}) {
  return {
    id: 10,
    name: 'Jane Analyst',
    email: 'jane@example.com',
    role: UserRole.ANALYST,
    avatar: null,
    createdAt,
    updatedAt,
    _count: {
      ownedSignals: 2,
      votes: 3,
      workshopParticipations: 1,
    },
    ...overrides,
  };
}

function createService() {
  const tx = {
    user: {
      upsert: jest.fn().mockResolvedValue({ id: 999 }),
      delete: jest.fn().mockResolvedValue({}),
    },
    signal: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
    signalHistory: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    signalVote: {
      aggregate: jest.fn().mockResolvedValue({
        _avg: { score: 8 },
        _count: { score: 2 },
      }),
      deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      findMany: jest.fn().mockResolvedValue([{ signalId: 44 }, { signalId: 44 }]),
    },
    workshopParticipant: {
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const prisma = {
    user: {
      count: jest.fn().mockResolvedValue(2),
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve(createUserRecord({
          id: 20,
          ...data,
          _count: {
            ownedSignals: 0,
            votes: 0,
            workshopParticipations: 0,
          },
        })),
      ),
      findMany: jest.fn().mockResolvedValue([createUserRecord()]),
      findUnique: jest.fn().mockResolvedValue(null),
      groupBy: jest.fn().mockResolvedValue([
        { role: UserRole.ADMIN, _count: { role: 1 } },
        { role: UserRole.ANALYST, _count: { role: 1 } },
      ]),
      update: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve(createUserRecord({
          ...data,
        })),
      ),
    },
    $transaction: jest.fn().mockImplementation((callback) => callback(tx)),
  };
  const service = new AdminUsersService(prisma as unknown as PrismaService);

  return { prisma, service, tx };
}

describe('AdminUsersService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('blocks non-admin users from listing workspace users', async () => {
    const { service } = createService();

    await expect(service.findAll(analystUser, {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('returns normalized admin user records for administrators', async () => {
    const { service } = createService();

    const response = await service.findAll(adminUser, {});

    expect(response.users[0]).toMatchObject({
      id: 10,
      name: 'Jane Analyst',
      counts: {
        signals: 2,
        votes: 3,
        workshops: 1,
      },
    });
    expect(response.meta.roles).toMatchObject({
      ADMIN: 1,
      ANALYST: 1,
    });
  });

  it('creates users with normalized email and trimmed name', async () => {
    const { prisma, service } = createService();

    const response = await service.create(adminUser, {
      name: '  New Analyst  ',
      email: ' NEW@EXAMPLE.COM ',
      password: 'temporary-password',
      role: UserRole.ANALYST,
    });

    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        name: 'New Analyst',
        email: 'new@example.com',
        role: UserRole.ANALYST,
      }),
    }));
    expect(response.user).toMatchObject({
      email: 'new@example.com',
      name: 'New Analyst',
    });
  });

  it('prevents regular admins from assigning system admin access', async () => {
    const { service } = createService();

    await expect(
      service.create(adminUser, {
        name: 'System Candidate',
        email: 'candidate@example.com',
        password: 'temporary-password',
        role: UserRole.ADMIN_SYSTEM,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows system admins to assign system admin access', async () => {
    const { prisma, service } = createService();

    await service.create(systemAdminUser, {
      name: 'New System Admin',
      email: 'newsystem@example.com',
      password: 'temporary-password',
      role: UserRole.ADMIN_SYSTEM,
    });

    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        role: UserRole.ADMIN_SYSTEM,
      }),
    }));
  });

  it('prevents admins from changing their own role', async () => {
    const { prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue(createUserRecord({
      id: adminUser.id,
      role: UserRole.ADMIN,
    }));

    await expect(
      service.update(adminUser.id, adminUser, { role: UserRole.ANALYST }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('prevents users from deleting their own account', async () => {
    const { service } = createService();

    await expect(service.delete(adminUser.id, adminUser)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('softens deleted-user references and recalculates affected vote scores', async () => {
    const { prisma, service, tx } = createService();
    prisma.user.findUnique.mockResolvedValue(createUserRecord({ id: 15 }));

    const response = await service.delete(15, adminUser);

    expect(response.success).toBe(true);
    expect(tx.signal.updateMany).toHaveBeenCalledWith({
      where: { ownerId: 15 },
      data: { ownerId: null },
    });
    expect(tx.signalHistory.updateMany).toHaveBeenCalledWith({
      where: { userId: 15 },
      data: { userId: 999 },
    });
    expect(tx.signal.update).toHaveBeenCalledWith({
      where: { id: 44 },
      data: {
        impactScore: 8,
        totalVotes: 2,
      },
    });
  });
});
