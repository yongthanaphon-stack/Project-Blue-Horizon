import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { SignalsService } from './signals.service';

@Controller('api/public/signals')
export class SignalsPublicController {
  constructor(private readonly signalsService: SignalsService) {}

  @Get('featured')
  findFeatured(
    @Query('limit', new DefaultValuePipe(3), ParseIntPipe) limit: number,
  ) {
    return this.signalsService.findFeatured(limit);
  }

  @Get('suggestions')
  findSuggestions(
    @Query('search') search = '',
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ) {
    return this.signalsService.findSuggestions(search, limit);
  }
}
