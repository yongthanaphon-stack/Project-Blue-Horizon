import {
  BadGatewayException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  CreateScenarioDto,
  GenerateScenarioSignalDto,
  UpdateScenarioDto,
} from './dto/scenario.dto';
import OpenAI from 'openai';

@Injectable()
export class ScenariosService {
  private aiClient: OpenAI;
  private readonly aiApiKey?: string;
  private readonly aiModel: string;

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {
    this.aiApiKey = process.env.DOTBLUE_API_KEY;
    this.aiModel = process.env.DOTBLUE_MODEL || 'openai/gpt-4o-mini';
    this.aiClient = new OpenAI({
      apiKey: this.aiApiKey || 'missing-key',
      baseURL: process.env.DOTBLUE_BASE_URL || 'https://ai.psu.blue/v1',
    });
  }

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

  async update(id: number, data: UpdateScenarioDto, actorRole?: string) {
    const scenario = await this.prisma.scenario.findUnique({
      where: { id },
    });

    if (!scenario) {
      throw new NotFoundException('Scenario not found.');
    }

    if (scenario.isSelected && !this.isAdminRole(actorRole)) {
      throw new ForbiddenException(
        'Only administrators can edit a saved scenario.',
      );
    }

    const updateData: Record<string, string | string[]> = {};
    const editableTextFields: Array<keyof Omit<UpdateScenarioDto, 'keyDrivers'>> = [
      'title',
      'description',
      'focus',
      'probability',
      'milestone',
    ];

    editableTextFields.forEach((field) => {
      const value = data[field];
      if (value !== undefined) {
        updateData[field] = value.trim();
      }
    });

    if (data.keyDrivers !== undefined) {
      updateData.keyDrivers = data.keyDrivers
        .map((driver) => driver.trim())
        .filter(Boolean);
    }

    if (!Object.keys(updateData).length) {
      return scenario;
    }

    return this.prisma.scenario.update({
      where: { id },
      data: updateData,
    });
  }

  async generateScenarioFromAI(
    workshopId: number,
    actorId?: number,
    radarSignals: GenerateScenarioSignalDto[] = [],
  ) {
    try {
      if (!this.aiApiKey) {
        throw new ServiceUnavailableException(
          'AI provider is not configured. Set DOTBLUE_API_KEY in backend/.env.',
        );
      }

      const workshop = await this.prisma.workshop.findUnique({
        where: { id: workshopId },
        include: {
          signals: true,
          scenarios: {
            orderBy: { createdAt: 'desc' },
            take: 12,
          },
        },
      });

      if (!workshop) {
        throw new NotFoundException('Workshop not found.');
      }

      const selectedRadarSignals = radarSignals.filter(
        (signal) => signal.name?.trim() && signal.description?.trim(),
      );
      const inputSignalsContext = selectedRadarSignals.length
        ? selectedRadarSignals
            .map((signal) => {
              const details = [
                `Description: ${signal.description}`,
                signal.category ? `PESTEL: ${signal.category}` : '',
                signal.horizon ? `Horizon: ${signal.horizon}` : '',
                signal.horizonDetail ? `Horizon detail: ${signal.horizonDetail}` : '',
                signal.impactLevel ? `Impact level: ${signal.impactLevel}` : '',
              ].filter(Boolean);

              return `- ${signal.name}: ${details.join(' | ')}`;
            })
            .join('\n')
        : workshop.signals
            .map((s) => `- ${s.name}: ${s.shortDetails || s.description}`)
            .join('\n');
      const inputSignalSourceLabel = selectedRadarSignals.length
        ? 'Radar-selected input signals'
        : 'Workshop input signals';
      const existingScenarios = workshop.scenarios.map((scenario) => ({
        title: scenario.title,
        description: scenario.description,
        focus: scenario.focus,
        milestone: scenario.milestone,
      }));
      const existingScenarioTitles = new Set(
        existingScenarios.map((scenario) => this.normalizeTitle(scenario.title)),
      );
      const existingScenariosContext = existingScenarios.length
        ? existingScenarios
            .map((scenario, index) => {
              const details = [
                `Title: ${scenario.title}`,
                `Description: ${scenario.description}`,
                scenario.focus ? `Focus: ${scenario.focus}` : '',
                scenario.milestone ? `Milestone: ${scenario.milestone}` : '',
              ].filter(Boolean);

              return `${index + 1}. ${details.join(' | ')}`;
            })
            .join('\n')
        : 'No existing scenarios yet.';

      const buildPrompt = (duplicateTitle?: string) => `
        SYSTEM PROMPT =
        คุณคือผู้เชี่ยวชาญด้าน Strategic Foresight ระดับโลก ที่เชี่ยวชาญการวิเคราะห์ Signals of Change เพื่อสร้าง Future Scenarios สำหรับสถาบันอุดมศึกษาในประเทศไทยและภูมิภาคอาเซียน

        ภูมิหลัง:
        - ใช้กรอบ PESTEL, Horizon Scanning และ Scenario Planning
        - มุ่งเน้นผลกระทบต่อในระยะ 5-10 ปีข้างหน้า (Time Horizon: ${workshop.horizon})
        - ให้ข้อมูลเชิงกลยุทธ์ที่นำไปปฏิบัติได้จริง

        ${inputSignalSourceLabel}:
        ${inputSignalsContext}

        Existing scenarios to avoid:
        ${existingScenariosContext}

        Diversity goal:
        - Generate a scenario that is meaningfully different from every existing scenario above.
        - Do not reuse or lightly rephrase an existing title.
        - Use a new scenario archetype, strategic tension, causal pathway, milestone, and focus area.
        - If the same signals could support multiple futures, choose a less obvious branch than prior outputs.
        ${duplicateTitle ? `- The previous AI attempt reused the title "${duplicateTitle}". You must choose a completely new title and framing now.` : ''}

        กฎเหล็ก:
        - ตอบเป็น JSON Array เท่านั้น - ห้ามมี markdown, backtick หรือข้อความอื่นใดทั้งสิ้น
        - ห้าม prefix เช่น "Here is..." หรือ "\`\`\`json"
        - เริ่มต้นด้วย [ และจบด้วย ] เท่านั้น
        - ทุก field ต้องมีข้อมูล ห้าม null หรือ empty string
        - title ต้องไม่ซ้ำกับ Existing scenarios to avoid และต้องไม่เป็นแค่การเปลี่ยนคำเล็กน้อย
        - description ต้องเล่าอนาคตคนละแบบ ไม่ใช่แค่เปลี่ยนคำจาก scenario เดิม

        Output format: JSON
        ข้อมูลที่จำเป็นต่อการสร้าง Scenario (บังคับโครงสร้างดังนี้):
        [{
          "title": "text | ชื่อหัวเรื่องของ Scenario",
          "description": "text | คำอธิบายรายละเอียดของ Scenario",
          "milestone": "text | หมุดหมาย/เป้าหมายสำคัญของ Scenario",
          "probability": "text | ความน่าจะเป็นที่ Scenario จะเกิดขึ้น",
          "focus": "text | จุดโฟกัส/ประเด็นหลักของ Scenario",
          "keyDrivers": ["text | ปัจจัยขับเคลื่อนที่ 1", "text | ปัจจัยขับเคลื่อนที่ 2"]
        }]
      `;

      let scenarioData = await this.requestScenarioFromAI(buildPrompt());

      if (existingScenarioTitles.has(this.normalizeTitle(scenarioData.title))) {
        scenarioData = await this.requestScenarioFromAI(
          buildPrompt(scenarioData.title),
        );
      }

      if (existingScenarioTitles.has(this.normalizeTitle(scenarioData.title))) {
        throw new BadGatewayException(
          'AI returned a duplicate scenario title. Please generate again.',
        );
      }

      const newScenario = await this.prisma.scenario.create({
        data: {
          title: scenarioData.title,
          description: scenarioData.description,
          focus: scenarioData.focus,
          probability: scenarioData.probability,
          milestone: scenarioData.milestone,
          keyDrivers: scenarioData.keyDrivers || [],
          isSelected: false,
          workshopId,
        },
      });

      await this.notifications.notifyScenarioCreated(newScenario.id, actorId);

      return newScenario;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (this.isProviderError(error)) {
        throw new BadGatewayException(
          `AI provider request failed: ${error.message}`,
        );
      }

      console.error('AI Generation Error:', error);
      throw new InternalServerErrorException(
        'Failed to generate scenario using AI.',
      );
    }
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

  private async requestScenarioFromAI(prompt: string) {
    const response = await this.aiClient.chat.completions.create({
      model: this.aiModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
    });

    const content = this.extractAiContent(response);

    if (!content) {
      throw new BadGatewayException('AI returned an empty response.');
    }

    const aiContent = content
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsedData;
    try {
      parsedData = JSON.parse(aiContent);
    } catch (parseError) {
      console.error('Failed to parse AI Content:', aiContent);
      throw new BadGatewayException('AI response format is invalid.');
    }

    const scenarioData = Array.isArray(parsedData) ? parsedData[0] : parsedData;

    if (
      !scenarioData?.title ||
      !scenarioData?.description ||
      !scenarioData?.milestone ||
      !scenarioData?.probability ||
      !scenarioData?.focus
    ) {
      throw new BadGatewayException('AI response is missing scenario fields.');
    }

    return scenarioData as {
      title: string;
      description: string;
      milestone: string;
      probability: string;
      focus: string;
      keyDrivers?: string[];
    };
  }

  private normalizeTitle(title: string) {
    return title.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private extractAiContent(response: unknown): string | undefined {
    if (typeof response === 'string') {
      return this.extractContentFromSse(response);
    }

    const choices = (
      response as {
        choices?: Array<{
          delta?: { content?: unknown };
          message?: { content?: unknown };
        }>;
      }
    )?.choices;

    if (!Array.isArray(choices)) return undefined;

    return choices
      .map((choice) => {
        const messageContent = choice.message?.content;
        if (typeof messageContent === 'string') return messageContent;

        const deltaContent = choice.delta?.content;
        if (typeof deltaContent === 'string') return deltaContent;

        return '';
      })
      .join('')
      .trim() || undefined;
  }

  private extractContentFromSse(response: string): string | undefined {
    const content: string[] = [];

    response.split(/\r?\n/).forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine.startsWith('data:')) return;

      const data = trimmedLine.slice('data:'.length).trim();
      if (!data || data === '[DONE]') return;

      try {
        const event = JSON.parse(data) as {
          choices?: Array<{
            delta?: { content?: unknown };
            message?: { content?: unknown };
          }>;
        };

        event.choices?.forEach((choice) => {
          const deltaContent = choice.delta?.content;
          if (typeof deltaContent === 'string') {
            content.push(deltaContent);
          }

          const messageContent = choice.message?.content;
          if (typeof messageContent === 'string') {
            content.push(messageContent);
          }
        });
      } catch {
        // Ignore malformed stream fragments; missing content is handled below.
      }
    });

    return content.join('').trim() || undefined;
  }

  private isProviderError(error: unknown): error is { message: string } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as { message?: unknown }).message === 'string' &&
      ('status' in error || 'code' in error)
    );
  }
}
