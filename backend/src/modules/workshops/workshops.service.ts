import { Injectable, ForbiddenException } from '@nestjs/common';
import { Prisma, TimeHorizon } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateWorkshopDto } from './dto/workshop.dto';

@Injectable()
export class WorkshopsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findAll() {
    const workshops = await this.prisma.workshop.findMany({
      orderBy: { lastActive: 'desc' },
      include: {
        participants: { include: { user: true } },
        _count: { select: { participants: true } },
      },
    });

    const outputs = await this.prisma.workshopOutput.findMany({
      orderBy: { date: 'desc' },
      take: 10,
    });

    return { workshops, outputs };
  }

  async findOne(id: number) {
    return this.prisma.workshop.findUnique({
      where: { id },
      include: {
        participants: { include: { user: true } },
        scenarios: true,
        outputs: { orderBy: { date: 'desc' } },
      },
    });
  }

  async findOneWithAccess(id: number, userId: number) {
    const workshop = await this.findOne(id);

    if (!workshop) {
      return null;
    }

    const isParticipant = workshop.participants?.some(
      (p) => p.userId === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException(
        'You do not have access to this workshop session',
      );
    }

    return workshop;
  }

  async create(data: CreateWorkshopDto, actorId?: number) {
    const participantIds = new Set([
      ...(data.participantIds || []),
      ...(actorId ? [actorId] : []),
    ]);

    const workshopData: Prisma.WorkshopCreateInput = {
      name: data.name,
      description: data.description,
      horizon: data.horizon || TimeHorizon.H1,
    };

    if (participantIds.size) {
      workshopData.participants = {
        create: Array.from(participantIds).map((userId) => ({
          user: { connect: { id: userId } },
        })),
      };
    }

    const workshop = await this.prisma.workshop.create({
      data: workshopData,
    });

    await this.notifications.notifyWorkshopCreated(workshop.id, actorId);

    return workshop;
  }
}
