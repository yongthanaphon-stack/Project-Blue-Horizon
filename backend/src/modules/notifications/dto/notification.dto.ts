import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { NotificationType, UserRole } from '@prisma/client';

export class NotificationQueryDto {
  @IsOptional()
  @IsIn(['all', 'unread', 'read', 'archived'])
  status?: 'all' | 'unread' | 'read' | 'archived';

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  dailySummary?: boolean;

  @IsOptional()
  @IsBoolean()
  signalVotes?: boolean;

  @IsOptional()
  @IsBoolean()
  signalNeedsVote?: boolean;

  @IsOptional()
  @IsBoolean()
  workshopReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  scenarioUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  swotUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  systemAnnouncements?: boolean;
}

export class BroadcastNotificationDto {
  @IsString()
  @MaxLength(140)
  title!: string;

  @IsString()
  @MaxLength(1000)
  message!: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  href?: string;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  userIds?: number[];

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
