import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  ParseIntPipe,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest, JwtGuard } from '../auth/jwt.guard';
import { SwotService } from './swot.service';
import { AddSwotItemDto, UpsertSwotDto } from './dto/swot.dto';

@UseGuards(JwtGuard)
@Controller('api/swot')
export class SwotController {
  constructor(private readonly swotService: SwotService) {}

  @Get(':scenarioId')
  findByScenario(
    @Param('scenarioId', ParseIntPipe) scenarioId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.swotService.findByScenario(scenarioId, req.user);
  }

  @Put(':scenarioId')
  upsert(
    @Param('scenarioId', ParseIntPipe) scenarioId: number,
    @Body() data: UpsertSwotDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.swotService.upsert(scenarioId, data, req.user);
  }

  @Post(':scenarioId/item')
  addItem(
    @Param('scenarioId', ParseIntPipe) scenarioId: number,
    @Body() data: AddSwotItemDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.swotService.addItem(
      scenarioId,
      data.quadrant,
      data.item,
      req.user,
    );
  }
}
