import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest, JwtGuard } from '../auth/jwt.guard';
import { WorkshopsService } from './workshops.service';
import { CreateWorkshopDto } from './dto/workshop.dto';

@UseGuards(JwtGuard)
@Controller('api/workshops')
export class WorkshopsController {
  constructor(private readonly workshopsService: WorkshopsService) {}

  @Get()
  findAll() {
    return this.workshopsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.workshopsService.findOne(id);
  }

  @Post()
  create(
    @Body() data: CreateWorkshopDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.workshopsService.create(data, req.user.id);
  }
}
