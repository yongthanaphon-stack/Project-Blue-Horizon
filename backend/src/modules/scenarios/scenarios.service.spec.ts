import {
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ScenariosService } from './scenarios.service';

describe('ScenariosService AI generation', () => {
  const originalApiKey = process.env.DOTBLUE_API_KEY;

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.DOTBLUE_API_KEY;
    } else {
      process.env.DOTBLUE_API_KEY = originalApiKey;
    }
    jest.restoreAllMocks();
  });

  function createService({
    apiKey = 'test-key',
    aiContent = JSON.stringify([
      {
        title: 'Adaptive Campus',
        description: 'AI-supported learning ecosystems become standard.',
        milestone: 'First scaled deployment',
        probability: 'High',
        focus: 'Teaching and learning',
        keyDrivers: ['AI adoption', 'Digital infrastructure'],
      },
    ]),
    aiResponse,
    aiResponses,
    workshop = {
      id: 7,
      name: 'Thai Higher Education 2035',
      description: 'Future scenarios for Thai university strategy.',
      horizon: 'H2',
      scenarios: [],
      signals: [
        {
          name: 'AI tutors',
          shortDetails: 'Personalized tutoring expands.',
          description: 'AI tutoring systems improve access.',
        },
      ],
    },
  }: {
    apiKey?: string;
    aiContent?: string;
    aiResponse?: unknown;
    aiResponses?: unknown[];
    workshop?:
      | {
          id: number;
          name?: string;
          description?: string | null;
          horizon: string;
          scenarios?: Array<{
            title: string;
            description: string;
            focus?: string | null;
            milestone?: string | null;
          }>;
          signals: Array<{
            name: string;
            shortDetails: string;
            description: string;
          }>;
        }
      | null;
  } = {}) {
    if (apiKey) {
      process.env.DOTBLUE_API_KEY = apiKey;
    } else {
      delete process.env.DOTBLUE_API_KEY;
    }

    const prisma = {
      workshop: {
        findUnique: jest.fn().mockResolvedValue(workshop),
      },
      scenario: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 42,
            ...data,
          }),
        ),
      },
    };
    const notifications = {
      notifyScenarioCreated: jest.fn().mockResolvedValue(undefined),
    };
    const service = new ScenariosService(prisma as any, notifications as any);
    const defaultAiResponse = aiResponse ?? {
        choices: [
          {
            message: {
              content: aiContent,
            },
          },
        ],
      };
    const aiCreate = jest.fn();
    (aiResponses ?? [defaultAiResponse]).forEach((response) => {
      aiCreate.mockResolvedValueOnce(response);
    });
    aiCreate.mockResolvedValue(defaultAiResponse);

    (service as any).aiClient = {
      chat: {
        completions: {
          create: aiCreate,
        },
      },
    };

    return { service, prisma, notifications, aiCreate };
  }

  it('requires DOTBLUE_API_KEY before contacting the AI provider', async () => {
    const { service, aiCreate } = createService({ apiKey: '' });

    await expect(service.generateScenarioFromAI(7, 9)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(aiCreate).not.toHaveBeenCalled();
  });

  it('reports a missing workshop as not found', async () => {
    const { service, aiCreate } = createService({ workshop: null });

    await expect(service.generateScenarioFromAI(404, 9)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(aiCreate).not.toHaveBeenCalled();
  });

  it('creates a scenario from a fenced AI JSON response', async () => {
    const { service, prisma, notifications } = createService({
      aiContent:
        '```json\n[{"title":"Adaptive Campus","description":"AI-supported learning ecosystems become standard.","milestone":"First scaled deployment","probability":"High","focus":"Teaching and learning","keyDrivers":["AI adoption","Digital infrastructure"]}]\n```',
    });

    const scenario = await service.generateScenarioFromAI(7, 9);

    expect(scenario).toMatchObject({
      id: 42,
      title: 'Adaptive Campus',
      workshopId: 7,
      isSelected: false,
    });
    expect(prisma.scenario.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Adaptive Campus',
        keyDrivers: ['AI adoption', 'Digital infrastructure'],
      }),
    });
    expect(notifications.notifyScenarioCreated).toHaveBeenCalledWith(42, 9);
  });

  it('uses an available dotBlue model by default', async () => {
    const { service, aiCreate } = createService();

    await service.generateScenarioFromAI(7, 9);

    expect(aiCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'openai/gpt-4o-mini',
      }),
    );
  });

  it('creates a scenario from a dotBlue SSE response string', async () => {
    const { service, prisma } = createService({
      aiResponse:
        'data: {"choices":[{"delta":{"content":"[{\\"title\\":\\"SSE Campus\\",\\"description\\":\\"Scenario from streamed chunks\\",\\"milestone\\":\\"Pilot launched\\",\\"probability\\":\\"Medium\\",\\"focus\\":\\"Digital strategy\\",\\"keyDrivers\\":[\\"AI platforms\\"]}]"}}],"finish_reason":null}\n\n' +
        'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n' +
        'data: [DONE]\n\n',
    });

    const scenario = await service.generateScenarioFromAI(7, 9);

    expect(scenario).toMatchObject({
      title: 'SSE Campus',
      workshopId: 7,
    });
    expect(prisma.scenario.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        description: 'Scenario from streamed chunks',
        keyDrivers: ['AI platforms'],
      }),
    });
  });

  it('includes existing scenarios in the prompt so AI avoids repeating them', async () => {
    const { service, aiCreate } = createService({
      aiContent: JSON.stringify([
        {
          title: 'Distributed Campus Commons',
          description: 'A new scenario that does not reuse the existing title.',
          milestone: 'Cross-campus services become interoperable',
          probability: 'Medium',
          focus: 'Institutional collaboration',
          keyDrivers: ['AI tutors', 'Shared platforms'],
        },
      ]),
      workshop: {
        id: 7,
        name: 'Thai Higher Education 2035',
        description: 'Future scenarios for Thai university strategy.',
        horizon: 'H2',
        signals: [
          {
            name: 'AI tutors',
            shortDetails: 'Personalized tutoring expands.',
            description: 'AI tutoring systems improve access.',
          },
        ],
        scenarios: [
          {
            title: 'Adaptive Campus',
            description: 'AI-supported learning ecosystems become standard.',
            focus: 'Teaching and learning',
            milestone: 'First scaled deployment',
          },
        ],
      },
    });

    await service.generateScenarioFromAI(7, 9);

    expect(aiCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            content: expect.stringContaining('Scenario เดิมที่ต้องหลีกเลี่ยง'),
          }),
        ],
      }),
    );
    expect(aiCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            content: expect.stringContaining('Adaptive Campus'),
          }),
        ],
      }),
    );
  });

  it('anchors the AI prompt to the workshop topic and description', async () => {
    const { service, aiCreate } = createService({
      workshop: {
        id: 7,
        name: 'อนาคตมหาวิทยาลัยไทยในยุคประชากรลดลง',
        description: 'สร้างฉากทัศน์สำหรับกลยุทธ์มหาวิทยาลัยไทยเมื่อจำนวนนักศึกษาลดลง',
        horizon: 'H3',
        scenarios: [],
        signals: [
          {
            name: 'AI tutors',
            shortDetails: 'Personalized tutoring expands.',
            description: 'AI tutoring systems improve access.',
          },
        ],
      },
    });

    await service.generateScenarioFromAI(7, 9);

    expect(aiCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            content: expect.stringContaining('หัวข้อและเป้าหมายของ Workshop'),
          }),
        ],
      }),
    );
    expect(aiCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            content: expect.stringContaining('อนาคตมหาวิทยาลัยไทยในยุคประชากรลดลง'),
          }),
        ],
      }),
    );
    expect(aiCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            content: expect.stringContaining('สร้างฉากทัศน์สำหรับกลยุทธ์มหาวิทยาลัยไทยเมื่อจำนวนนักศึกษาลดลง'),
          }),
        ],
      }),
    );
  });

  it('retries once when AI returns an existing scenario title', async () => {
    const { service, prisma, aiCreate } = createService({
      workshop: {
        id: 7,
        name: 'Thai Higher Education 2035',
        description: 'Future scenarios for Thai university strategy.',
        horizon: 'H2',
        signals: [
          {
            name: 'AI tutors',
            shortDetails: 'Personalized tutoring expands.',
            description: 'AI tutoring systems improve access.',
          },
        ],
        scenarios: [
          {
            title: 'Adaptive Campus',
            description: 'AI-supported learning ecosystems become standard.',
          },
        ],
      },
      aiResponses: [
        {
          choices: [
            {
              message: {
                content: JSON.stringify([
                  {
                    title: 'Adaptive Campus',
                    description: 'A repeated title with a changed description.',
                    milestone: 'Second version',
                    probability: 'High',
                    focus: 'Teaching and learning',
                    keyDrivers: ['AI adoption'],
                  },
                ]),
              },
            },
          ],
        },
        {
          choices: [
            {
              message: {
                content: JSON.stringify([
                  {
                    title: 'Ambient Learning Grid',
                    description: 'A distinct scenario with a new strategic frame.',
                    milestone: 'Adaptive services become invisible infrastructure',
                    probability: 'Medium',
                    focus: 'Campus infrastructure',
                    keyDrivers: ['AI adoption', 'Sensor networks'],
                  },
                ]),
              },
            },
          ],
        },
      ],
    });

    const scenario = await service.generateScenarioFromAI(7, 9);

    expect(aiCreate).toHaveBeenCalledTimes(2);
    expect(scenario).toMatchObject({
      title: 'Ambient Learning Grid',
    });
    expect(prisma.scenario.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Ambient Learning Grid',
      }),
    });
  });

  it('uses radar-selected signals in the prompt when provided', async () => {
    const { service, aiCreate } = createService();

    await service.generateScenarioFromAI(7, 9, [
      {
        id: 'radar-ai-advising',
        name: 'Radar AI Advising Assistants',
        description: 'A signal selected from the Environmental Scanning radar.',
        category: 'TECHNOLOGY',
        horizon: 'H2 (3-5 Years)',
      },
    ]);

    expect(aiCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            content: expect.stringContaining('สัญญาณที่เลือกจากเรดาร์'),
          }),
        ],
      }),
    );
    expect(aiCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            content: expect.stringContaining('Radar AI Advising Assistants'),
          }),
        ],
      }),
    );
  });
});

describe('ScenariosService scenario editing', () => {
  function createEditService(scenario: Record<string, unknown> | null) {
    const prisma = {
      scenario: {
        findUnique: jest.fn().mockResolvedValue(scenario),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            ...scenario,
            ...data,
          }),
        ),
      },
    };
    const notifications = {
      notifyScenarioCreated: jest.fn(),
      notifyScenarioSelected: jest.fn(),
    };

    return {
      service: new ScenariosService(prisma as any, notifications as any),
      prisma,
    };
  }

  it('updates editable scenario detail fields', async () => {
    const { service, prisma } = createEditService({
      id: 42,
      isSelected: false,
      title: 'Old scenario',
      description: 'Old description',
      focus: 'Old focus',
      probability: 'Low',
      milestone: 'Old milestone',
      keyDrivers: ['Old driver'],
    });

    const scenario = await service.update(
      42,
      {
        title: '  Revised scenario  ',
        description: 'Revised detail',
        focus: 'Strategic renewal',
        probability: 'Medium',
        milestone: '2030 institutional shift',
        keyDrivers: ['AI adoption', '  ', 'Policy reform'],
      },
      'ANALYST',
    );

    expect(prisma.scenario.findUnique).toHaveBeenCalledWith({
      where: { id: 42 },
    });
    expect(prisma.scenario.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: {
        title: 'Revised scenario',
        description: 'Revised detail',
        focus: 'Strategic renewal',
        probability: 'Medium',
        milestone: '2030 institutional shift',
        keyDrivers: ['AI adoption', 'Policy reform'],
      },
    });
    expect(scenario).toMatchObject({
      title: 'Revised scenario',
      keyDrivers: ['AI adoption', 'Policy reform'],
    });
  });

  it('blocks non-admin users from editing a saved scenario', async () => {
    const { service, prisma } = createEditService({
      id: 42,
      isSelected: true,
      title: 'Locked scenario',
    });

    await expect(
      service.update(42, { title: 'Changed' }, 'ANALYST'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.scenario.update).not.toHaveBeenCalled();
  });

  it('allows admins to edit a saved scenario', async () => {
    const { service, prisma } = createEditService({
      id: 42,
      isSelected: true,
      title: 'Locked scenario',
    });

    await service.update(42, { title: 'Admin revision' }, 'ADMIN');

    expect(prisma.scenario.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { title: 'Admin revision' },
    });
  });

  it('reports a missing scenario as not found when editing', async () => {
    const { service, prisma } = createEditService(null);

    await expect(
      service.update(404, { title: 'Missing' }, 'ADMIN'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.scenario.update).not.toHaveBeenCalled();
  });
});
