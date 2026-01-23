import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { EventsModule } from './events/events.module';
import { OcrModule } from './ocr/ocr.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule,
    PrismaModule,
    EventsModule,
    OcrModule,
    PrescriptionsModule,
    HealthModule,
  ],
})
export class AppModule {}
