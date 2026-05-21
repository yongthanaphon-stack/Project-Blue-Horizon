import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export const SWOT_QUADRANTS = [
  'strengths',
  'weaknesses',
  'opportunities',
  'threats',
] as const;

export type SwotQuadrant = (typeof SWOT_QUADRANTS)[number];

export class UpsertSwotDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  strengths?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  weaknesses?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  opportunities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  threats?: string[];
}

export class AddSwotItemDto {
  @IsIn(SWOT_QUADRANTS)
  quadrant!: SwotQuadrant;

  @IsString()
  item!: string;
}
