import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SwotController } from './swot.controller';
import { SwotService } from './swot.service';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [SwotController],
  providers: [SwotService],
  exports: [SwotService],
})
export class SwotModule {}
