import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../core/prisma/prisma.service';
import { PresenceService } from '../../core/presence/presence.service';
import { NotificationsGateway } from './notifications.gateway';
import { AuthenticatedSocket } from './notifications.gateway';

function anyString(): string {
  const matcher: unknown = expect.any(String);
  return matcher as string;
}

describe('NotificationsGateway radar collaboration', () => {
  function createGateway() {
    const jwtService = {} as JwtService;
    const presence = {} as PresenceService;
    const prisma = {
      workshop: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7,
          participants: [{ id: 1 }],
        }),
      },
    };
    const gateway = new NotificationsGateway(
      jwtService,
      presence,
      prisma as unknown as PrismaService,
    );
    const emitToRoom = jest.fn();
    const to = jest.fn().mockReturnValue({ emit: emitToRoom });
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
      to,
    } as unknown as AuthenticatedSocket;

    return { gateway, prisma, client, emitToRoom, to };
  }

  it('broadcasts radar updates to other users in the workshop room', async () => {
    const { gateway, prisma, client, emitToRoom, to } = createGateway();
    const signals = [{ id: 'signal-1', name: 'Quantum tutors' }];

    await gateway.handleRadarUpdate(client, {
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
    expect(to).toHaveBeenCalledWith('workshop:7');
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
      updatedAt: anyString(),
    });
  });
});
