import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateScenarioDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsNumber()
  workshopId!: number;

  @IsOptional()
  @IsString()
  focus?: string;

  @IsOptional()
  @IsString()
  probability?: string;

  @IsOptional()
  @IsString()
  milestone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyDrivers?: string[];
}

export class SelectScenariosDto {
  @IsNumber()
  workshopId!: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  scenarioIds!: number[];
}

export class GenerateScenarioSignalDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  horizon?: string;

  @IsOptional()
  @IsString()
  horizonDetail?: string;

  @IsOptional()
  @IsString()
  impactLevel?: string;
}

export class GenerateScenarioDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GenerateScenarioSignalDto)
  radarSignals?: GenerateScenarioSignalDto[];
}
