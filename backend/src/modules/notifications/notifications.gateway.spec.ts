import { NotificationsGateway } from './notifications.gateway';

describe('NotificationsGateway radar collaboration', () => {
  function createGateway() {
    const jwtService = {};
    const presence = {};
    const prisma = {
      workshop: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7,
          participants: [{ id: 1 }],
        }),
      },
    };
    const gateway = new NotificationsGateway(
      jwtService as any,
      presence as any,
      prisma as any,
    );
    const emitToRoom = jest.fn();
    const client = {
      id: 'socket-1',
      data: {
        user: {
          id: 42,
          name: 'Mira Analyst',
          email: 'mira@example.com',
          role: 'ANALYST',
          avatar: null,
        },
      },
      emit: jest.fn(),
      join: jest.fn().mockResolvedValue(undefined),
      to: jest.fn().mockReturnValue({ emit: emitToRoom }),
    };

    return { gateway, prisma, client, emitToRoom };
  }

  it('broadcasts radar updates to other users in the workshop room', async () => {
    const { gateway, prisma, client, emitToRoom } = createGateway();
    const signals = [{ id: 'signal-1', name: 'Quantum tutors' }];

    await (gateway as any).handleRadarUpdate(client, {
      workshopId: 7,
      signals,
      action: 'added',
      signalId: 'signal-1',
      signalName: null,
      clientMutationId: 'mutation-1',
    });

    expect(prisma.workshop.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
      }),
    );
    expect(client.to).toHaveBeenCalledWith('workshop:7');
    expect(emitToRoom).toHaveBeenCalledWith('radar:updated', {
      workshopId: 7,
      signals,
      action: 'added',
      signalId: 'signal-1',
      signalName: null,
      clientMutationId: 'mutation-1',
      actor: {
        id: 42,
        name: 'Mira Analyst',
        email: 'mira@example.com',
        role: 'ANALYST',
        avatar: null,
      },
      updatedAt: expect.any(String),
    });
  });
});
