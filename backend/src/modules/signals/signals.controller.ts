import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtGuard, type AuthenticatedRequest } from '../auth/jwt.guard';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { SignalsService } from './signals.service';
import {
  CreateSignalDto,
  UpdateSignalDto,
  VoteSignalDto,
  SignalQueryDto,
} from './dto/signal.dto';

@UseGuards(JwtGuard)
@Controller('api/signals')
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  @Get()
  findAll(@Query() query: SignalQueryDto) {
    return this.signalsService.findAll(query);
  }

  @Get('needs-vote')
  findNeedsVote(@Request() req: AuthenticatedRequest) {
    return this.signalsService.findNeedsVote(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.signalsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSignalDto, @Request() req: AuthenticatedRequest) {
    return this.signalsService.create(dto, req.user.id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSignalDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.signalsService.update(id, dto, req.user);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post(':id/vote')
  vote(@Param('id', ParseIntPipe) id: number, @Body() dto: VoteSignalDto, @Request() req: AuthenticatedRequest) {
    return this.signalsService.vote(id, dto, req.user.id);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number, @Request() req: AuthenticatedRequest) {
    return this.signalsService.delete(id, req.user);
  }
}
