import { Module } from '@nestjs/common';
import { SignalsController } from './signals.controller';
import { SignalsPublicController } from './signals-public.controller';
import { SignalsService } from './signals.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [SignalsController, SignalsPublicController],
  providers: [SignalsService],
  exports: [SignalsService],
})
export class SignalsModule {}
