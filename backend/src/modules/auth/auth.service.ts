import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../core/prisma/prisma.service';
import { LoginDto, SignupDto } from './dto/auth.dto';

type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  preferredFont?: string | null;
};

type JwtPayload = {
  user: AuthUser;
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists.');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        passwordHash,
      },
    });

    return this.createAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.createAuthResponse(user);
  }

  async me(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.user.id },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid token.');
      }

      return this.toAuthUser(user);
    } catch {
      throw new UnauthorizedException('Invalid token.');
    }
  }

  createAuthResponse(user: AuthUser) {
    const authUser = this.toAuthUser(user);
    return {
      user: authUser,
      token: this.signToken(authUser),
    };
  }

  toAuthUser(user: AuthUser) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      preferredFont: user.preferredFont || 'google-sans-flex',
    };
  }

  private signToken(user: AuthUser) {
    return this.jwtService.sign({ user });
  }
}
