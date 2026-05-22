import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest, JwtGuard } from '../auth/jwt.guard';
import { ScenariosService } from './scenarios.service';
import {
  CreateScenarioDto,
  GenerateScenarioDto,
  SelectScenariosDto,
} from './dto/scenario.dto';

@UseGuards(JwtGuard)
@Controller('api/scenarios')
export class ScenariosController {
  constructor(private readonly scenariosService: ScenariosService) {}

  @Get()
  findByWorkshop(@Query('workshopId', ParseIntPipe) workshopId: number) {
    return this.scenariosService.findByWorkshop(workshopId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.scenariosService.findOne(id);
  }

  @Post()
  create(
    @Body() data: CreateScenarioDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.scenariosService.create(data, req.user.id);
  }

  @Put('selected')
  selectScenarios(
    @Body() data: SelectScenariosDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.scenariosService.selectScenarios(
      data.scenarioIds,
      data.workshopId,
      req.user.id,
      req.user.role,
    );
  }

  @Put(':id/select')
  selectScenario(
    @Param('id', ParseIntPipe) id: number,
    @Body('workshopId', ParseIntPipe) workshopId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.scenariosService.selectScenario(
      id,
      workshopId,
      req.user.id,
      req.user.role,
    );
  }

  @Post(':workshopId/generate-ai')
  generateWithAI(
    @Param('workshopId', ParseIntPipe) workshopId: number,
    @Body() data: GenerateScenarioDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.scenariosService.generateScenarioFromAI(
      workshopId,
      req.user.id,
      data.radarSignals,
    );
  }
}
