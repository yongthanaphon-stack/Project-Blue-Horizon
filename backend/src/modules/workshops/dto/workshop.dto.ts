import {
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { PestelCategory, TimeHorizon } from '@prisma/client';

export class CreateWorkshopDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TimeHorizon)
  horizon?: TimeHorizon;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  participantIds?: number[];
}

export class UpsertWorkshopSignalSelectionDto {
  @IsEnum(PestelCategory)
  category!: PestelCategory;

  @IsEnum(TimeHorizon)
  horizon!: TimeHorizon;

  @IsObject()
  placement!: Record<string, unknown>;
}
