import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import {
  ImpactLevel,
  TimeHorizon,
  PestelCategory,
  SignalStatus,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';

function toArray(value: unknown): unknown[] | undefined {
  if (Array.isArray(value)) return value as unknown[];
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string' && value.includes(',')) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [value];
}

export class CreateSignalDto {
  @IsString()
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Description cannot exceed 2000 characters' })
  shortDetails?: string;

  @IsString()
  @MaxLength(2000, { message: 'Description cannot exceed 2000 characters' })
  description!: string;

  @IsOptional()
  @IsString()
  referenceSource?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(PestelCategory, { each: true })
  pestelCategories?: PestelCategory[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stakeholders?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(ImpactLevel)
  impactLevel?: ImpactLevel;

  @IsOptional()
  @IsEnum(TimeHorizon)
  timeHorizon?: TimeHorizon;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;

  @IsOptional()
  @IsEnum(SignalStatus)
  status?: SignalStatus;

  @IsOptional()
  @IsArray()
  references?: { title: string; url: string }[];
}

export class UpdateSignalDto {
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Description cannot exceed 2000 characters' })
  shortDetails?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Description cannot exceed 2000 characters' })
  description?: string;

  @IsOptional()
  @IsString()
  referenceSource?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(PestelCategory, { each: true })
  pestelCategories?: PestelCategory[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stakeholders?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(ImpactLevel)
  impactLevel?: ImpactLevel;

  @IsOptional()
  @IsEnum(TimeHorizon)
  timeHorizon?: TimeHorizon;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;

  @IsOptional()
  @IsEnum(SignalStatus)
  status?: SignalStatus;

  @IsOptional()
  @IsArray()
  references?: { title: string; url: string }[];
}

export class VoteSignalDto {
  @IsNumber()
  @Min(1)
  @Max(10)
  score!: number;

  @IsOptional()
  @IsNumber()
  userId?: number;
}

export class SignalQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsEnum(PestelCategory, { each: true })
  pestel?: PestelCategory[];

  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsEnum(ImpactLevel, { each: true })
  impact?: ImpactLevel[];

  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsEnum(TimeHorizon, { each: true })
  horizon?: TimeHorizon[];

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

export class TagSuggestionQueryDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsEnum(PestelCategory, { each: true })
  pestel?: PestelCategory[];

  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
