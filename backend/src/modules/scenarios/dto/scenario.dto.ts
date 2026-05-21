import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

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
