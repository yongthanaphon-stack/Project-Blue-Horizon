import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export const FONT_PREFERENCES = [
  'google-sans-flex',
  'ibm-plex-sans-thai-looped',
  'noto-sans-thai-looped',
  'prompt',
] as const;

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  confirmPassword?: string;
}

export class UpdateProfilePreferencesDto {
  @IsOptional()
  @IsString()
  @IsIn([...FONT_PREFERENCES])
  preferredFont?: string;
}
