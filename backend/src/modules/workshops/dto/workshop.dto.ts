import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TimeHorizon } from '@prisma/client';

export class CreateWorkshopDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TimeHorizon)
  horizon?: TimeHorizon;
}
