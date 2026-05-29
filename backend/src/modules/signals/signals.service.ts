import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateSignalDto,
  UpdateSignalDto,
  VoteSignalDto,
  SignalQueryDto,
  TagSuggestionQueryDto,
} from './dto/signal.dto';
import { PestelCategory, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/jwt.guard';

const FEATURED_SIGNAL_NAMES = [
  'Automated Border Sovereignty Protocols',
  'Synthetic Content Liability Acts',
  'The Rise of "Zero-Trust" Freelancing',
];

const PESTEL_SEARCH_ALIASES: Record<string, PestelCategory> = {
  POLITICAL: PestelCategory.POLITICAL,
  POLITICS: PestelCategory.POLITICAL,
  POLICY: PestelCategory.POLITICAL,
  GOVERNANCE: PestelCategory.POLITICAL,
  ECONOMIC: PestelCategory.ECONOMIC,
  ECONOMY: PestelCategory.ECONOMIC,
  FINANCE: PestelCategory.ECONOMIC,
  SOCIAL: PestelCategory.SOCIAL,
  SOCIETY: PestelCategory.SOCIAL,
  CULTURE: PestelCategory.SOCIAL,
  TECHNOLOGICAL: PestelCategory.TECHNOLOGICAL,
  TECHNOLOGY: PestelCategory.TECHNOLOGICAL,
  TECH: PestelCategory.TECHNOLOGICAL,
  DIGITAL: PestelCategory.TECHNOLOGICAL,
  ENVIRONMENTAL: PestelCategory.ENVIRONMENTAL,
  ENVIRONMENT: PestelCategory.ENVIRONMENTAL,
  ENVIRO: PestelCategory.ENVIRONMENTAL,
  CLIMATE: PestelCategory.ENVIRONMENTAL,
  LEGAL: PestelCategory.LEGAL,
  LAW: PestelCategory.LEGAL,
  REGULATION: PestelCategory.LEGAL,
};

const featuredSignalSelect = {
  id: true,
  name: true,
  shortDetails: true,
  description: true,
  pestelCategories: true,
  impactLevel: true,
  timeHorizon: true,
  impactScore: true,
  status: true,
  totalVotes: true,
  isGlobal: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { votes: true } },
} satisfies Prisma.SignalSelect;

type FeaturedSignal = Prisma.SignalGetPayload<{
  select: typeof featuredSignalSelect;
}>;

const suggestionSignalSelect = {
  id: true,
  name: true,
  shortDetails: true,
  pestelCategories: true,
  impactLevel: true,
  impactScore: true,
  totalVotes: true,
} satisfies Prisma.SignalSelect;

type SignalComputedFields = {
  impactScore?: unknown;
  totalVotes?: unknown;
  communityInterest?: unknown;
};

type SignalRelationFields = {
  references?: unknown;
  tags?: unknown;
};

function omitSignalComputedFields<T extends object>(dto: T): T {
  const writableDto = { ...dto } as T & SignalComputedFields;
  delete writableDto.impactScore;
  delete writableDto.totalVotes;
  delete writableDto.communityInterest;
  return writableDto;
}

function omitSignalRelationFields<T extends object>(
  dto: T,
): Omit<T, keyof SignalRelationFields> {
  const writableDto = { ...dto } as T & SignalRelationFields;
  delete writableDto.references;
  delete writableDto.tags;
  return writableDto;
}

type SignalPresentationFields = {
  impactScore?: number | null;
  totalVotes?: number | null;
};

type TagSuggestionItem = {
  tag: string;
  count: number;
  score: number;
  source: 'suggested' | 'related' | 'popular';
};

type TagSignalSource = {
  tags: string[];
  pestelCategories: PestelCategory[];
};

function getCommunityInterest(totalVotes?: number | null): number {
  const votes = Number(totalVotes || 0);
  if (votes <= 0) return 0;
  return Math.min(100, Math.ceil((votes / (votes + 6)) * 100));
}

function withSignalPresentation<T extends SignalPresentationFields>(signal: T) {
  const totalVotes = Number(signal.totalVotes || 0);

  return {
    ...signal,
    impactScore: totalVotes > 0 ? (signal.impactScore ?? null) : null,
    communityInterest: getCommunityInterest(totalVotes),
  };
}

function getPestelSearchCategory(search: string): PestelCategory | undefined {
  const normalized = search
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
  return PESTEL_SEARCH_ALIASES[normalized];
}

function buildSignalSearchConditions(
  search: string,
): Prisma.SignalWhereInput[] {
  const term = search.trim();
  if (!term) return [];

  const conditions: Prisma.SignalWhereInput[] = [
    { name: { contains: term, mode: 'insensitive' } },
    { shortDetails: { contains: term, mode: 'insensitive' } },
    { description: { contains: term, mode: 'insensitive' } },
  ];

  const pestelCategory = getPestelSearchCategory(term);
  if (pestelCategory) {
    conditions.push({ pestelCategories: { has: pestelCategory } });
  }

  return conditions;
}

function normalizeTag(tag: unknown) {
  if (typeof tag !== 'string' && typeof tag !== 'number') return '';

  return String(tag)
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeTagList(tags: unknown[] = [], limit = 12) {
  const normalizedTags: string[] = [];
  const seenTags = new Set<string>();

  tags.forEach((tag) => {
    const normalizedTag = normalizeTag(tag);
    if (!normalizedTag || seenTags.has(normalizedTag)) return;

    seenTags.add(normalizedTag);
    normalizedTags.push(normalizedTag);
  });

  return normalizedTags.slice(0, limit);
}

function incrementTagCount(
  counts: Map<string, number>,
  tag: string,
  amount = 1,
) {
  counts.set(tag, (counts.get(tag) || 0) + amount);
}

function rankTagCounts(
  counts: Map<string, number>,
  source: TagSuggestionItem['source'],
  {
    query = '',
    excludeTags = new Set<string>(),
    limit = 8,
  }: {
    query?: string;
    excludeTags?: Set<string>;
    limit?: number;
  } = {},
) {
  const normalizedQuery = normalizeTag(query);

  return Array.from(counts.entries())
    .filter(([tag]) => !excludeTags.has(tag))
    .filter(([tag]) => !normalizedQuery || tag.includes(normalizedQuery))
    .sort(
      ([tagA, countA], [tagB, countB]) =>
        countB - countA || tagA.localeCompare(tagB),
    )
    .slice(0, limit)
    .map(([tag, count]) => ({
      tag,
      count,
      score: count,
      source,
    }));
}

type Sanitizer = {
  sanitize: (dirty: string) => string;
};

let sanitizer: Sanitizer | undefined;

async function getSanitizer(): Promise<Sanitizer> {
  if (!sanitizer) {
    const [{ default: createDOMPurify }, { JSDOM }] = await Promise.all([
      import('dompurify'),
      import('jsdom'),
    ]);
    const window = new JSDOM('').window;
    sanitizer = createDOMPurify(window);
  }

  return sanitizer;
}

@Injectable()
export class SignalsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findFeatured(limit = 3) {
    const take = Math.min(Math.max(Number(limit) || 3, 1), 6);
    const where: Prisma.SignalWhereInput = {
      deletedAt: null,
      isGlobal: true,
      status: 'PUBLISHED',
      workshopId: null,
    };

    const candidates = await this.prisma.signal.findMany({
      where: {
        ...where,
        name: { in: FEATURED_SIGNAL_NAMES },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: featuredSignalSelect,
    });

    const latestByName = new Map<string, FeaturedSignal>();
    for (const signal of candidates) {
      if (!latestByName.has(signal.name)) {
        latestByName.set(signal.name, signal);
      }
    }

    const selected = FEATURED_SIGNAL_NAMES.map((name) => latestByName.get(name))
      .filter((signal): signal is FeaturedSignal => Boolean(signal))
      .slice(0, take);

    if (selected.length < take) {
      const selectedIds = selected.map((signal) => signal.id);
      const fallbackSignals = await this.prisma.signal.findMany({
        where: {
          ...where,
          ...(selectedIds.length > 0 ? { id: { notIn: selectedIds } } : {}),
        },
        orderBy: [
          { impactScore: 'desc' },
          { totalVotes: 'desc' },
          { createdAt: 'desc' },
        ],
        take: take - selected.length,
        select: featuredSignalSelect,
      });
      selected.push(...fallbackSignals);
    }

    return selected.map(withSignalPresentation);
  }

  async findSuggestions(search = '', limit = 5) {
    const take = Math.min(Math.max(Number(limit) || 5, 1), 8);
    const term = search.trim();
    const where: Prisma.SignalWhereInput = {
      deletedAt: null,
      isGlobal: true,
      status: 'PUBLISHED',
      workshopId: null,
    };

    const searchConditions = buildSignalSearchConditions(term);
    if (searchConditions.length > 0) {
      where.OR = searchConditions;
    }

    const suggestions = await this.prisma.signal.findMany({
      where,
      orderBy: [
        { totalVotes: 'desc' },
        { impactScore: 'desc' },
        { createdAt: 'desc' },
      ],
      take,
      select: suggestionSignalSelect,
    });

    return suggestions.map(withSignalPresentation);
  }

  async findTagSuggestions(query: TagSuggestionQueryDto = {}) {
    const limit = Math.min(Math.max(Number(query.limit) || 8, 1), 12);
    const selectedTags = new Set(normalizeTagList(query.tags || []));
    const pestelInput = Array.isArray(query.pestel)
      ? query.pestel
      : query.pestel
        ? [query.pestel]
        : [];
    const pestelCategories = new Set(pestelInput);

    const signals = await this.prisma.signal.findMany({
      where: {
        deletedAt: null,
        isGlobal: true,
        status: 'PUBLISHED',
        workshopId: null,
        tags: { isEmpty: false },
      },
      select: {
        tags: true,
        pestelCategories: true,
      },
      take: 500,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });

    const popularCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();
    const relatedCounts = new Map<string, number>();

    signals.forEach((signal: TagSignalSource) => {
      const signalTags = normalizeTagList(signal.tags, 24);
      const hasSelectedTag = signalTags.some((tag) => selectedTags.has(tag));
      const isCategoryMatch =
        pestelCategories.size === 0
          ? false
          : signal.pestelCategories.some((category) =>
              pestelCategories.has(category),
            );

      signalTags.forEach((tag) => {
        incrementTagCount(popularCounts, tag);

        if (isCategoryMatch) {
          incrementTagCount(categoryCounts, tag);
        }

        if (hasSelectedTag && !selectedTags.has(tag)) {
          incrementTagCount(relatedCounts, tag);
        }
      });
    });

    const suggested = rankTagCounts(categoryCounts, 'suggested', {
      query: query.query,
      excludeTags: selectedTags,
      limit,
    });
    const related = rankTagCounts(relatedCounts, 'related', {
      query: query.query,
      excludeTags: selectedTags,
      limit,
    });
    const popular = rankTagCounts(popularCounts, 'popular', {
      query: query.query,
      limit,
    });

    return {
      suggested: suggested.length ? suggested : popular.slice(0, limit),
      related,
      popular,
    };
  }

  async findAll(query: SignalQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SignalWhereInput = { deletedAt: null };

    // By default, Signal Bank shows Global signals (workshopId: null, isGlobal: true)
    where.workshopId = null;
    where.isGlobal = true;

    const searchConditions = buildSignalSearchConditions(query.search || '');
    if (searchConditions.length > 0) {
      where.OR = searchConditions;
    }

    // PESTEL filter includes multi-category signals that contain any selected category.
    if (query.pestel) {
      const pestelArray = Array.isArray(query.pestel)
        ? query.pestel
        : [query.pestel];
      where.pestelCategories = { hasSome: pestelArray };
    }

    // Multi-select Impact Level filter (OR logic within field)
    if (query.impact) {
      const impactArray = Array.isArray(query.impact)
        ? query.impact
        : [query.impact];
      where.impactLevel = { in: impactArray };
    }

    // Multi-select Time Horizon filter (OR logic within field)
    if (query.horizon) {
      const horizonArray = Array.isArray(query.horizon)
        ? query.horizon
        : [query.horizon];
      where.timeHorizon = { in: horizonArray };
    }

    // Date range filter (created date)
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    const [signals, total] = await Promise.all([
      this.prisma.signal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          references: true,
          _count: { select: { votes: true } },
        },
      }),
      this.prisma.signal.count({ where }),
    ]);

    const mappedSignals = signals.map(withSignalPresentation);

    return {
      data: mappedSignals,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findNeedsVote(userId: number) {
    const signals = await this.prisma.signal.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        workshopId: null,
        isGlobal: true,
        votes: { none: { userId } },
        OR: [{ ownerId: null }, { ownerId: { not: userId } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        references: true,
        _count: { select: { votes: true } },
      },
    });

    return signals.map(withSignalPresentation);
  }

  async findOne(id: number) {
    const sig = await this.prisma.signal.findUnique({
      where: { id },
      include: {
        references: true,
        votes: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        _count: { select: { votes: true } },
        histories: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        scenarios: true,
      },
    });

    if (!sig || sig.deletedAt) throw new NotFoundException('Signal not found');

    return withSignalPresentation(sig);
  }

  async create(dto: CreateSignalDto, userId: number) {
    const { references, tags, ...signalData } = omitSignalComputedFields(dto);
    const purify = await getSanitizer();

    const safeDescription = purify.sanitize(signalData.description || '');
    const safeName = purify.sanitize(signalData.name || '');
    const safeShortDetails = signalData.shortDetails
      ? purify.sanitize(signalData.shortDetails)
      : '';

    const signal = await this.prisma.signal.create({
      data: {
        ...signalData,
        name: safeName,
        shortDetails: safeShortDetails,
        description: safeDescription,
        pestelCategories: signalData.pestelCategories || [],
        stakeholders: signalData.stakeholders || [],
        tags: normalizeTagList(tags || []),
        isGlobal: signalData.isGlobal || false,
        ownerId: userId,
        impactScore: 0,
        totalVotes: 0,
        references: references
          ? {
              create: references.map((ref) => ({
                title: purify.sanitize(ref.title),
                url: ref.url,
              })),
            }
          : undefined,
        histories: {
          create: {
            action: 'CREATED',
            userId,
          },
        },
      },
      include: { references: true },
    });

    await this.notifications.notifySignalNeedsVote(signal, userId);

    return withSignalPresentation(signal);
  }

  async update(id: number, dto: UpdateSignalDto, user: AuthenticatedUser) {
    const signal = await this.prisma.signal.findUnique({ where: { id } });
    if (!signal || signal.deletedAt)
      throw new NotFoundException('Signal not found');

    if (
      user.role !== 'ADMIN' &&
      user.role !== 'ADMIN_SYSTEM' &&
      signal.ownerId !== user.id
    ) {
      throw new ForbiddenException('You can only edit your own signals');
    }

    const { tags } = dto;
    const signalData = omitSignalRelationFields(omitSignalComputedFields(dto));
    const purify = await getSanitizer();
    if (signalData.description)
      signalData.description = purify.sanitize(signalData.description);
    if (signalData.name) signalData.name = purify.sanitize(signalData.name);

    const wasPublishedGlobal =
      signal.status === 'PUBLISHED' &&
      signal.isGlobal &&
      signal.workshopId === null;

    const updatedSignal = await this.prisma.signal.update({
      where: { id },
      data: {
        ...signalData,
        ...(tags ? { tags: normalizeTagList(tags) } : {}),
        histories: {
          create: {
            action: 'UPDATED',
            changes: JSON.stringify(Object.keys(signalData)),
            userId: user.id,
          },
        },
      },
      include: { references: true },
    });

    if (!wasPublishedGlobal) {
      await this.notifications.notifySignalNeedsVote(updatedSignal, user.id);
    }

    return withSignalPresentation(updatedSignal);
  }

  async vote(id: number, dto: VoteSignalDto, userId: number) {
    const signal = await this.prisma.signal.findUnique({ where: { id } });
    if (!signal || signal.deletedAt)
      throw new NotFoundException('Signal not found');
    if (signal.ownerId === userId)
      throw new BadRequestException('Cannot vote for your own signal');

    await this.prisma.signalVote.upsert({
      where: {
        signalId_userId: { signalId: id, userId },
      },
      create: {
        signalId: id,
        userId,
        score: dto.score,
      },
      update: {
        score: dto.score,
      },
    });

    const result = await this.prisma.signalVote.aggregate({
      where: { signalId: id },
      _avg: { score: true },
      _count: { score: true },
    });

    const updatedSignal = await this.prisma.signal.update({
      where: { id },
      data: {
        impactScore: result._avg.score || 0,
        totalVotes: result._count.score,
      },
    });

    await this.notifications.notifySignalVote(id, userId, dto.score);

    return withSignalPresentation(updatedSignal);
  }

  async delete(id: number, user: AuthenticatedUser) {
    const signal = await this.prisma.signal.findUnique({
      where: { id },
      include: { scenarios: true },
    });
    if (!signal || signal.deletedAt)
      throw new NotFoundException('Signal not found');

    if (
      user.role !== 'ADMIN' &&
      user.role !== 'ADMIN_SYSTEM' &&
      signal.ownerId !== user.id
    ) {
      throw new ForbiddenException('You can only delete your own signals');
    }

    if (signal.scenarios && signal.scenarios.length > 0) {
      throw new BadRequestException(
        'Cannot delete signal linked to a scenario',
      );
    }

    const deletedSignal = await this.prisma.signal.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        histories: {
          create: {
            action: 'DELETED',
            userId: user.id,
          },
        },
      },
    });

    return withSignalPresentation(deletedSignal);
  }
}
