import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { PrismaAuditLogger } from '../common/prisma-audit-logger.service';

@Module({
  controllers: [AppointmentsController],
  providers: [
    AppointmentsService,
    {
      provide: 'AuditLogger',
      useClass: PrismaAuditLogger,
    },
  ],
})
export class AppointmentsModule {}
