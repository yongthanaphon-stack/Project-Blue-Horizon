import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PestelCategory, Prisma, TimeHorizon } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  CreateWorkshopDto,
  UpsertWorkshopSignalSelectionDto,
} from './dto/workshop.dto';

const SIGNAL_BANK_SELECT = {
  id: true,
  name: true,
  shortDetails: true,
  description: true,
  tags: true,
  pestelCategories: true,
  impactLevel: true,
  timeHorizon: true,
  impactScore: true,
  totalVotes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SignalSelect;

const HORIZON_LABELS: Record<TimeHorizon, string> = {
  H1: 'H1 (0-2 Years)',
  H2: 'H2 (3-5 Years)',
  H3: 'H3 (5-7 Years)',
};

const HORIZON_DETAILS: Record<TimeHorizon, string> = {
  H1: 'Near Term',
  H2: 'Medium Term',
  H3: 'Long Term',
};

type SignalBankRecord = Prisma.SignalGetPayload<{
  select: typeof SIGNAL_BANK_SELECT;
}>;

type WorkshopSelectionRecord = {
  id: number;
  workshopId: number;
  signalId: number;
  category: PestelCategory;
  horizon: TimeHorizon;
  placement: Prisma.JsonValue;
  signal: SignalBankRecord;
};

type WorkshopCandidateRecord = {
  id: number;
  workshopId: number;
  signalId: number;
  signal: SignalBankRecord;
};

function getPrimaryCategory(signal: SignalBankRecord) {
  return signal.pestelCategories[0] || PestelCategory.TECHNOLOGICAL;
}

function getDotColor(impactScore?: number | null) {
  const score = Number(impactScore || 0);
  if (score >= 8) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
}

function getDotCount(impactScore?: number | null) {
  const score = Number(impactScore || 0);
  if (score >= 8) return 3;
  if (score >= 5) return 2;
  return 1;
}

function toWorkshopSignal(
  signal: SignalBankRecord,
  selection?: WorkshopSelectionRecord,
) {
  const horizonCode = selection?.horizon || signal.timeHorizon;
  const category = selection?.category || getPrimaryCategory(signal);

  return {
    id: signal.id,
    signalId: signal.id,
    selectionId: selection?.id,
    name: signal.name,
    shortDetails: signal.shortDetails,
    description: signal.shortDetails || signal.description,
    fullDescription: signal.description,
    tags: signal.tags,
    pestelCategories: signal.pestelCategories,
    category,
    horizonCode,
    horizon: HORIZON_LABELS[horizonCode],
    horizonDetail: HORIZON_DETAILS[horizonCode],
    impactLevel: signal.impactLevel,
    impactScore: signal.impactScore,
    totalVotes: signal.totalVotes,
    dotColor: getDotColor(signal.impactScore),
    dotCount: getDotCount(signal.impactScore),
    placement: selection?.placement || null,
    createdAt: signal.createdAt,
    updatedAt: signal.updatedAt,
  };
}

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

  private async assertWorkshopAccess(id: number, userId: number) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id },
      include: {
        participants: { select: { userId: true } },
      },
    });

    if (!workshop) {
      throw new NotFoundException('Workshop not found');
    }

    const isParticipant = workshop.participants?.some(
      (participant) => participant.userId === userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException(
        'You do not have access to this workshop session',
      );
    }

    return workshop;
  }

  async getSignalSelection(id: number, userId: number) {
    await this.assertWorkshopAccess(id, userId);

    const [selectedRecords, candidateRecords] = await Promise.all([
      this.prisma.workshopSignalSelection.findMany({
        where: { workshopId: id },
        include: {
          signal: { select: SIGNAL_BANK_SELECT },
        },
        orderBy: [
          { updatedAt: 'asc' },
          { id: 'asc' },
        ],
      }),
      this.prisma.workshopSignalCandidate.findMany({
        where: { workshopId: id },
        include: {
          signal: { select: SIGNAL_BANK_SELECT },
        },
        orderBy: [
          { createdAt: 'asc' },
          { id: 'asc' },
        ],
      }),
    ]);

    const selectedSignalIds = new Set(
      selectedRecords.map((selection) => selection.signalId),
    );

    return {
      available: candidateRecords
        .filter((candidate: WorkshopCandidateRecord) =>
          !selectedSignalIds.has(candidate.signalId),
        )
        .map((candidate: WorkshopCandidateRecord) =>
          toWorkshopSignal(candidate.signal),
        ),
      selected: selectedRecords.map((selection) =>
        toWorkshopSignal(selection.signal, selection),
      ),
    };
  }

  async upsertSignalSelection(
    id: number,
    signalId: number,
    userId: number,
    data: UpsertWorkshopSignalSelectionDto,
  ) {
    await this.assertWorkshopAccess(id, userId);

    const candidateSignal = await this.prisma.workshopSignalCandidate.findFirst({
      where: {
        workshopId: id,
        signalId,
      },
    });

    if (!candidateSignal) {
      throw new NotFoundException('Signal is not in this workshop Signal Selection');
    }

    const selection = await this.prisma.workshopSignalSelection.upsert({
      where: {
        workshopId_signalId: {
          workshopId: id,
          signalId,
        },
      },
      create: {
        workshopId: id,
        signalId,
        category: data.category,
        horizon: data.horizon,
        placement: data.placement as Prisma.InputJsonValue,
        addedById: userId,
      },
      update: {
        category: data.category,
        horizon: data.horizon,
        placement: data.placement as Prisma.InputJsonValue,
        addedById: userId,
      },
      include: {
        signal: { select: SIGNAL_BANK_SELECT },
      },
    });

    return toWorkshopSignal(selection.signal, selection);
  }

  async removeSignalSelection(id: number, signalId: number, userId: number) {
    await this.assertWorkshopAccess(id, userId);

    await this.prisma.workshopSignalSelection.deleteMany({
      where: {
        workshopId: id,
        signalId,
      },
    });

    return { success: true };
  }

  async create(data: CreateWorkshopDto, actorId?: number) {
    const signalCandidateIds = Array.from(
      new Set((data.signalCandidateIds || []).filter(Boolean)),
    );
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

    if (signalCandidateIds.length) {
      workshopData.signalCandidates = {
        create: signalCandidateIds.map((signalId) => ({
          signal: { connect: { id: signalId } },
          ...(actorId ? { addedBy: { connect: { id: actorId } } } : {}),
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
