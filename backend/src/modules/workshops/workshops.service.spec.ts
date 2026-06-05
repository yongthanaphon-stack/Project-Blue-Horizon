import { PestelCategory, TimeHorizon } from '@prisma/client';
import { WorkshopsService } from './workshops.service';

describe('WorkshopsService signal selection', () => {
  function createService() {
    const prisma = {
      workshop: {
        findUnique: jest.fn(),
      },
      signal: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      workshopSignalSelection: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    const notifications = {
      notifyWorkshopCreated: jest.fn(),
    };

    return {
      service: new WorkshopsService(prisma as any, notifications as any),
      prisma,
    };
  }

  it('loads Signal Bank items and excludes signals already selected for the workshop', async () => {
    const { service, prisma } = createService();
    prisma.workshop.findUnique.mockResolvedValue({
      id: 7,
      participants: [{ userId: 3 }],
    });
    prisma.workshopSignalSelection.findMany.mockResolvedValue([
      {
        id: 11,
        workshopId: 7,
        signalId: 101,
        category: PestelCategory.TECHNOLOGICAL,
        horizon: TimeHorizon.H2,
        placement: { axisIndex: 3, radius: 152, angleOffset: 0 },
        signal: {
          id: 101,
          name: 'AI advising assistants',
          description: 'AI supports student advising.',
          shortDetails: 'AI support',
          pestelCategories: [PestelCategory.TECHNOLOGICAL],
          timeHorizon: TimeHorizon.H2,
          impactLevel: 'REGION',
          impactScore: 7.4,
          tags: ['ai'],
          createdAt: new Date('2026-01-02T00:00:00Z'),
          updatedAt: new Date('2026-01-03T00:00:00Z'),
        },
      },
    ]);
    prisma.signal.findMany.mockResolvedValue([
      {
        id: 101,
        name: 'AI advising assistants',
        description: 'AI supports student advising.',
        shortDetails: 'AI support',
        pestelCategories: [PestelCategory.TECHNOLOGICAL],
        timeHorizon: TimeHorizon.H2,
        impactLevel: 'REGION',
        impactScore: 7.4,
        tags: ['ai'],
        createdAt: new Date('2026-01-02T00:00:00Z'),
        updatedAt: new Date('2026-01-03T00:00:00Z'),
      },
      {
        id: 202,
        name: 'Climate resilient campus',
        description: 'Campus planning adapts to climate risk.',
        shortDetails: 'Climate planning',
        pestelCategories: [PestelCategory.ENVIRONMENTAL],
        timeHorizon: TimeHorizon.H3,
        impactLevel: 'GLOBAL',
        impactScore: 8.5,
        tags: ['climate'],
        createdAt: new Date('2026-02-02T00:00:00Z'),
        updatedAt: new Date('2026-02-03T00:00:00Z'),
      },
    ]);

    const result = await service.getSignalSelection(7, 3);

    expect(prisma.signal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          isGlobal: true,
          status: 'PUBLISHED',
          workshopId: null,
        }),
      }),
    );
    expect(result.selected).toHaveLength(1);
    expect(result.selected[0]).toEqual(
      expect.objectContaining({
        id: 101,
        signalId: 101,
        category: PestelCategory.TECHNOLOGICAL,
        horizonCode: TimeHorizon.H2,
        placement: { axisIndex: 3, radius: 152, angleOffset: 0 },
      }),
    );
    expect(result.available.map((signal) => signal.id)).toEqual([202]);
  });

  it('upserts workshop signal selection without mutating the Signal Bank source record', async () => {
    const { service, prisma } = createService();
    prisma.workshop.findUnique.mockResolvedValue({
      id: 7,
      participants: [{ userId: 3 }],
    });
    prisma.signal.findFirst.mockResolvedValue({
      id: 202,
      name: 'Climate resilient campus',
      description: 'Campus planning adapts to climate risk.',
      shortDetails: 'Climate planning',
      pestelCategories: [PestelCategory.ENVIRONMENTAL],
      timeHorizon: TimeHorizon.H3,
      impactLevel: 'GLOBAL',
      impactScore: 8.5,
      tags: ['climate'],
      createdAt: new Date('2026-02-02T00:00:00Z'),
      updatedAt: new Date('2026-02-03T00:00:00Z'),
    });
    prisma.workshopSignalSelection.upsert.mockResolvedValue({
      id: 22,
      workshopId: 7,
      signalId: 202,
      category: PestelCategory.ENVIRONMENTAL,
      horizon: TimeHorizon.H3,
      placement: { axisIndex: 4, radius: 214, angleOffset: -9 },
      signal: {
        id: 202,
        name: 'Climate resilient campus',
        description: 'Campus planning adapts to climate risk.',
        shortDetails: 'Climate planning',
        pestelCategories: [PestelCategory.ENVIRONMENTAL],
        timeHorizon: TimeHorizon.H3,
        impactLevel: 'GLOBAL',
        impactScore: 8.5,
        tags: ['climate'],
        createdAt: new Date('2026-02-02T00:00:00Z'),
        updatedAt: new Date('2026-02-03T00:00:00Z'),
      },
    });

    const result = await service.upsertSignalSelection(7, 202, 3, {
      category: PestelCategory.ENVIRONMENTAL,
      horizon: TimeHorizon.H3,
      placement: { axisIndex: 4, radius: 214, angleOffset: -9 },
    });

    expect(prisma.signal.findFirst).toHaveBeenCalledWith({
      where: {
        id: 202,
        deletedAt: null,
        isGlobal: true,
        status: 'PUBLISHED',
        workshopId: null,
      },
    });
    expect(prisma.workshopSignalSelection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          workshopId_signalId: {
            workshopId: 7,
            signalId: 202,
          },
        },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 202,
        signalId: 202,
        category: PestelCategory.ENVIRONMENTAL,
        horizonCode: TimeHorizon.H3,
      }),
    );
  });
});
