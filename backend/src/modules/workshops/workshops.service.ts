import { Injectable } from '@nestjs/common';
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

  async create(data: CreateWorkshopDto, actorId?: number) {
    const workshop = await this.prisma.workshop.create({
      data: {
        name: data.name,
        description: data.description,
        horizon: data.horizon || 'H1',
      },
    });

    await this.notifications.notifyWorkshopCreated(workshop.id, actorId);

    return workshop;
  }
}
