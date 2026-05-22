import { Module } from '@nestjs/common';
import { PrismaModule } from '../core/prisma/prisma.module';
import { SignalsModule } from '../modules/signals/signals.module';
import { WorkshopsModule } from '../modules/workshops/workshops.module';
import { ScenariosModule } from '../modules/scenarios/scenarios.module';
import { SwotModule } from '../modules/swot/swot.module';
import { AuthModule } from '../modules/auth/auth.module';
import { ProfileModule } from '../modules/profile/profile.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminUsersModule } from '../modules/admin-users/admin-users.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { UsersModule } from '../modules/users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    SignalsModule,
    WorkshopsModule,
    ScenariosModule,
    SwotModule,
    AuthModule,
    ProfileModule,
    AdminUsersModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
