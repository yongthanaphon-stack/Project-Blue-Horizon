import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/jwt.guard';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SwotService } from './swot.service';

const analyst: AuthenticatedUser = {
  id: 11,
  name: 'Nora Analyst',
  email: 'nora@example.com',
  role: 'ANALYST',
};

const admin: AuthenticatedUser = {
  id: 22,
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'ADMIN',
};

function createService({
  scenario = {
    id: 3,
    isSelected: true,
    title: 'Adaptive Campus',
    workshopId: 7,
    workshop: { participants: [{ id: 101 }] },
  },
  existingOutput = null,
}: {
  scenario?: unknown;
  existingOutput?: { id: number } | null;
} = {}) {
  const prisma = {
    scenario: {
      findUnique: jest.fn().mockResolvedValue(scenario),
    },
    swotAnalysis: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockImplementation(({ create }) =>
        Promise.resolve({
          id: 5,
          scenarioId: 3,
          ...create,
        }),
      ),
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 6,
          ...data,
        }),
      ),
      update: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 7,
          scenarioId: 3,
          ...data,
        }),
      ),
    },
    workshopOutput: {
      findFirst: jest.fn().mockResolvedValue(existingOutput),
      create: jest.fn().mockResolvedValue({ id: 8 }),
      update: jest.fn().mockResolvedValue({ id: existingOutput?.id || 8 }),
    },
  };
  const notifications = {
    notifySwotUpdated: jest.fn().mockResolvedValue(undefined),
  };
  const service = new SwotService(
    prisma as unknown as PrismaService,
    notifications as unknown as NotificationsService,
  );

  return { notifications, prisma, service };
}

describe('SwotService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('saves SWOT data and creates a workshop discussion output', async () => {
    const { notifications, prisma, service } = createService();

    await service.upsert(
      3,
      {
        strengths: ['Strong collaboration'],
        weaknesses: [],
        opportunities: ['New programs'],
        threats: [],
      },
      analyst,
    );

    expect(prisma.swotAnalysis.upsert).toHaveBeenCalledWith({
      where: { scenarioId: 3 },
      create: {
        scenarioId: 3,
        strengths: ['Strong collaboration'],
        weaknesses: [],
        opportunities: ['New programs'],
        threats: [],
      },
      update: {
        strengths: ['Strong collaboration'],
        weaknesses: [],
        opportunities: ['New programs'],
        threats: [],
      },
    });
    expect(prisma.workshopOutput.create).toHaveBeenCalledWith({
      data: {
        name: 'SWOT discussion brief: Adaptive Campus',
        type: 'SWOT Analysis',
        createdBy: 'Nora Analyst',
        workshopId: 7,
      },
    });
    expect(notifications.notifySwotUpdated).toHaveBeenCalledWith(3, analyst.id);
  });

  it('touches the existing discussion output instead of duplicating it', async () => {
    const { prisma, service } = createService({ existingOutput: { id: 88 } });

    await service.upsert(3, { strengths: ['Updated'] }, analyst);

    expect(prisma.workshopOutput.create).not.toHaveBeenCalled();
    expect(prisma.workshopOutput.update).toHaveBeenCalledWith({
      where: { id: 88 },
      data: {
        createdBy: 'Nora Analyst',
        date: expect.any(Date),
      },
    });
  });

  it('allows administrators to save SWOT even when they are not participants', async () => {
    const { prisma, service } = createService({
      scenario: {
        id: 3,
        isSelected: true,
        title: 'Adaptive Campus',
        workshopId: 7,
        workshop: { participants: [] },
      },
    });

    await service.upsert(3, { strengths: ['Admin note'] }, admin);

    expect(prisma.swotAnalysis.upsert).toHaveBeenCalled();
  });

  it('blocks SWOT work until the scenario is selected', async () => {
    const { prisma, service } = createService({
      scenario: {
        id: 3,
        isSelected: false,
        title: 'Draft scenario',
        workshopId: 7,
        workshop: { participants: [{ id: 101 }] },
      },
    });

    await expect(
      service.upsert(3, { strengths: ['Too early'] }, analyst),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.swotAnalysis.upsert).not.toHaveBeenCalled();
  });

  it('reports missing scenarios as not found', async () => {
    const { service } = createService({ scenario: null });

    await expect(service.findByScenario(404, analyst)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
