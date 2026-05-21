import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { LoginDto, SignupDto } from './dto/auth.dto';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('test-db')
  async testDb() {
    const signals = await this.prisma.signal.findMany({
      where: { deletedAt: null, workshopId: null }
    });
    return { success: true, count: signals.length, signals };
  }

  @Get('test-db2')
  async testDb2() {
    const all = await this.prisma.signal.findMany({
      where: { deletedAt: null, workshopId: null }
    });
    return { success: true, count: all.length, first: all[0] };
  }

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) {
      throw new UnauthorizedException('Missing token.');
    }

    return this.authService.me(token);
  }
}
