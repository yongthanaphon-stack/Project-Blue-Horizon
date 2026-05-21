import { Injectable } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SwotQuadrant, UpsertSwotDto } from './dto/swot.dto';

@Injectable()
export class SwotService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findByScenario(scenarioId: number) {
    return this.prisma.swotAnalysis.findUnique({
      where: { scenarioId },
      include: { scenario: true },
    });
  }

  async upsert(scenarioId: number, data: UpsertSwotDto, actorId?: number) {
    const swot = await this.prisma.swotAnalysis.upsert({
      where: { scenarioId },
      create: {
        scenarioId,
        strengths: data.strengths || [],
        weaknesses: data.weaknesses || [],
        opportunities: data.opportunities || [],
        threats: data.threats || [],
      },
      update: {
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        opportunities: data.opportunities,
        threats: data.threats,
      },
    });

    await this.notifications.notifySwotUpdated(scenarioId, actorId);

    return swot;
  }

  async addItem(
    scenarioId: number,
    quadrant: SwotQuadrant,
    item: string,
    actorId?: number,
  ) {
    const swot = await this.prisma.swotAnalysis.findUnique({
      where: { scenarioId },
    });

    if (!swot) {
      const createdSwot = await this.prisma.swotAnalysis.create({
        data: {
          scenarioId,
          strengths: quadrant === 'strengths' ? [item] : [],
          weaknesses: quadrant === 'weaknesses' ? [item] : [],
          opportunities: quadrant === 'opportunities' ? [item] : [],
          threats: quadrant === 'threats' ? [item] : [],
        },
      });

      await this.notifications.notifySwotUpdated(scenarioId, actorId);

      return createdSwot;
    }

    const currentItems = swot[quadrant] || [];
    const updatedSwot = await this.prisma.swotAnalysis.update({
      where: { scenarioId },
      data: { [quadrant]: [...currentItems, item] },
    });

    await this.notifications.notifySwotUpdated(scenarioId, actorId);

    return updatedSwot;
  }
}
