import {
  Controller,
  Delete,
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
import { WorkshopsService } from './workshops.service';
import {
  CreateWorkshopDto,
  UpsertWorkshopSignalSelectionDto,
} from './dto/workshop.dto';

@UseGuards(JwtGuard)
@Controller('api/workshops')
export class WorkshopsController {
  constructor(private readonly workshopsService: WorkshopsService) {}

  @Get()
  findAll() {
    return this.workshopsService.findAll();
  }

  @Get(':id/signal-selection')
  getSignalSelection(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.workshopsService.getSignalSelection(id, req.user.id);
  }

  @Put(':id/signal-selection/:signalId')
  upsertSignalSelection(
    @Param('id', ParseIntPipe) id: number,
    @Param('signalId', ParseIntPipe) signalId: number,
    @Body() data: UpsertWorkshopSignalSelectionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.workshopsService.upsertSignalSelection(
      id,
      signalId,
      req.user.id,
      data,
    );
  }

  @Delete(':id/signal-selection/:signalId')
  removeSignalSelection(
    @Param('id', ParseIntPipe) id: number,
    @Param('signalId', ParseIntPipe) signalId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.workshopsService.removeSignalSelection(id, signalId, req.user.id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.workshopsService.findOneWithAccess(id, req.user.id);
  }

  @Post()
  create(
    @Body() data: CreateWorkshopDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.workshopsService.create(data, req.user.id);
  }
}
