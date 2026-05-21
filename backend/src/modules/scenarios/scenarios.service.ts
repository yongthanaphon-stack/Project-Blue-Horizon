import { ForbiddenException, Injectable } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateScenarioDto } from './dto/scenario.dto';

@Injectable()
export class ScenariosService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findByWorkshop(workshopId: number) {
    return this.prisma.scenario.findMany({
      where: { workshopId },
      include: { swotAnalysis: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.scenario.findUnique({
      where: { id },
      include: { swotAnalysis: true, workshop: true },
    });
  }

  async create(data: CreateScenarioDto, actorId?: number) {
    const scenario = await this.prisma.scenario.create({
      data: {
        title: data.title,
        description: data.description,
        workshopId: data.workshopId,
        focus: data.focus,
        probability: data.probability,
        milestone: data.milestone,
        keyDrivers: data.keyDrivers || [],
      },
    });

    await this.notifications.notifyScenarioCreated(scenario.id, actorId);

    return scenario;
  }

  async selectScenario(
    id: number,
    workshopId: number,
    actorId?: number,
    actorRole?: string,
  ) {
    const scenarios = await this.selectScenarios(
      [id],
      workshopId,
      actorId,
      actorRole,
    );

    return scenarios[0];
  }

  async selectScenarios(
    scenarioIds: number[],
    workshopId: number,
    actorId?: number,
    actorRole?: string,
  ) {
    const uniqueScenarioIds = [...new Set(scenarioIds)];
    const hasSavedSelection = await this.prisma.scenario.count({
      where: {
        workshopId,
        isSelected: true,
      },
    });

    if (hasSavedSelection > 0 && !this.isAdminRole(actorRole)) {
      throw new ForbiddenException(
        'Only administrators can edit a saved scenario selection',
      );
    }

    await this.prisma.$transaction([
      this.prisma.scenario.updateMany({
        where: { workshopId },
        data: { isSelected: false },
      }),
      this.prisma.scenario.updateMany({
        where: {
          id: { in: uniqueScenarioIds },
          workshopId,
        },
        data: { isSelected: true },
      }),
    ]);

    const scenarios = await this.prisma.scenario.findMany({
      where: {
        id: { in: uniqueScenarioIds },
        workshopId,
        isSelected: true,
      },
      include: { swotAnalysis: true },
      orderBy: { createdAt: 'desc' },
    });

    await Promise.all(
      scenarios.map((scenario) =>
        this.notifications.notifyScenarioSelected(
          scenario.id,
          workshopId,
          actorId,
        ),
      ),
    );

    return scenarios;
  }

  private isAdminRole(role?: string) {
    return role === 'ADMIN' || role === 'ADMIN_SYSTEM';
  }
}
