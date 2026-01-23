import { Module } from '@nestjs/common';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { OcrModule } from '../ocr/ocr.module';
import { PrismaAuditLogger } from '../common/prisma-audit-logger.service';

@Module({
  imports: [OcrModule],
  controllers: [PrescriptionsController],
  providers: [
    PrescriptionsService,
    {
      provide: 'AuditLogger',
      useClass: PrismaAuditLogger,
    },
  ],
})
export class PrescriptionsModule {}
