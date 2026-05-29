import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from '../core/prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test-db')
  async testDb() {
    try {
      const signals = await this.prisma.signal.findMany({
        where: { deletedAt: null, workshopId: null },
      });
      return { success: true, count: signals.length, signals };
    } catch (error) {
      return { success: false, error: (error as any).message };
    }
  }
}
