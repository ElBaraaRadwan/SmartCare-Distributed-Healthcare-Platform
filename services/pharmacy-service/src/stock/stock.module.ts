import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { PrismaAuditLogger } from '../common/prisma-audit-logger.service';

@Module({
  controllers: [StockController],
  providers: [
    StockService,
    {
      provide: 'AuditLogger',
      useClass: PrismaAuditLogger,
    },
  ],
  exports: [StockService],
})
export class StockModule {}
