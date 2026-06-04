import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/jwt.guard';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SwotQuadrant, UpsertSwotDto } from './dto/swot.dto';

type ScenarioForSwot = {
  id: number;
  isSelected: boolean;
  title: string;
  workshopId: number;
  workshop: {
    participants: Array<{ id: number }>;
  };
};

const SWOT_OUTPUT_TYPE = 'SWOT Analysis';

@Injectable()
export class SwotService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findByScenario(scenarioId: number, user: AuthenticatedUser) {
    await this.ensureScenarioAccess(scenarioId, user);

    return this.prisma.swotAnalysis.findUnique({
      where: { scenarioId },
      include: { scenario: true },
    });
  }

  async upsert(
    scenarioId: number,
    data: UpsertSwotDto,
    actor: AuthenticatedUser,
  ) {
    const scenario = await this.ensureScenarioAccess(scenarioId, actor);
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

    await this.createOrUpdateDiscussionOutput(scenario, actor);
    await this.notifications.notifySwotUpdated(scenarioId, actor.id);

    return swot;
  }

  async addItem(
    scenarioId: number,
    quadrant: SwotQuadrant,
    item: string,
    actor: AuthenticatedUser,
  ) {
    const scenario = await this.ensureScenarioAccess(scenarioId, actor);
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

      await this.createOrUpdateDiscussionOutput(scenario, actor);
      await this.notifications.notifySwotUpdated(scenarioId, actor.id);

      return createdSwot;
    }

    const currentItems = swot[quadrant] || [];
    const updatedSwot = await this.prisma.swotAnalysis.update({
      where: { scenarioId },
      data: { [quadrant]: [...currentItems, item] },
    });

    await this.createOrUpdateDiscussionOutput(scenario, actor);
    await this.notifications.notifySwotUpdated(scenarioId, actor.id);

    return updatedSwot;
  }

  private async ensureScenarioAccess(
    scenarioId: number,
    user: AuthenticatedUser,
  ): Promise<ScenarioForSwot> {
    const scenario = await this.prisma.scenario.findUnique({
      where: { id: scenarioId },
      select: {
        id: true,
        isSelected: true,
        title: true,
        workshopId: true,
        workshop: {
          select: {
            participants: {
              where: { userId: user.id },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!scenario) {
      throw new NotFoundException('Scenario not found.');
    }

    if (!this.isAdminRole(user.role) && !scenario.workshop.participants.length) {
      throw new ForbiddenException(
        'You do not have access to this workshop session.',
      );
    }

    if (!scenario.isSelected) {
      throw new ForbiddenException(
        'Save this scenario selection before starting SWOT analysis.',
      );
    }

    return scenario;
  }

  private async createOrUpdateDiscussionOutput(
    scenario: ScenarioForSwot,
    actor: AuthenticatedUser,
  ) {
    const outputName = `SWOT discussion brief: ${scenario.title}`;
    const createdBy = actor.name || actor.email || 'Blue Horizon';
    const existingOutput = await this.prisma.workshopOutput.findFirst({
      where: {
        name: outputName,
        type: SWOT_OUTPUT_TYPE,
        workshopId: scenario.workshopId,
      },
      select: { id: true },
    });

    if (existingOutput) {
      return this.prisma.workshopOutput.update({
        where: { id: existingOutput.id },
        data: {
          createdBy,
          date: new Date(),
        },
      });
    }

    return this.prisma.workshopOutput.create({
      data: {
        name: outputName,
        type: SWOT_OUTPUT_TYPE,
        createdBy,
        workshopId: scenario.workshopId,
      },
    });
  }

  private isAdminRole(role?: string | null) {
    return role === 'ADMIN' || role === 'ADMIN_SYSTEM';
  }
}
