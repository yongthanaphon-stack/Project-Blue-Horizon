import { PestelCategory } from '@prisma/client';
import { SignalsService } from './signals.service';

describe('SignalsService tag suggestions', () => {
  function createService(signals: Array<{
    tags: string[];
    pestelCategories: PestelCategory[];
  }>) {
    const prisma = {
      signal: {
        findMany: jest.fn().mockResolvedValue(signals),
      },
    };
    const notifications = {};

    return {
      service: new SignalsService(prisma as any, notifications as any),
      prisma,
    };
  }

  it('prioritizes matching PESTEL tags, related tags, then popular tags', async () => {
    const { service, prisma } = createService([
      {
        tags: ['AI', 'Automation', 'Education'],
        pestelCategories: [PestelCategory.TECHNOLOGICAL],
      },
      {
        tags: ['AI', 'Automation', 'Personalization'],
        pestelCategories: [PestelCategory.TECHNOLOGICAL],
      },
      {
        tags: ['Education', 'Personalization', 'Policy'],
        pestelCategories: [PestelCategory.SOCIAL],
      },
      {
        tags: ['Funding', 'Policy'],
        pestelCategories: [PestelCategory.ECONOMIC],
      },
    ]);

    const suggestions = await (service as any).findTagSuggestions({
      pestel: PestelCategory.TECHNOLOGICAL,
      tags: ['education'],
      limit: 5,
    });

    expect(prisma.signal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          isGlobal: true,
          workshopId: null,
        }),
      }),
    );
    expect(suggestions.suggested.map((item: { tag: string }) => item.tag)).toEqual([
      'ai',
      'automation',
      'personalization',
    ]);
    expect(suggestions.related.map((item: { tag: string }) => item.tag)).toEqual([
      'ai',
      'automation',
      'personalization',
      'policy',
    ]);
    expect(suggestions.popular.map((item: { tag: string }) => item.tag)).toEqual([
      'ai',
      'automation',
      'education',
      'personalization',
      'policy',
    ]);
  });
});
