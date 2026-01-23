import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { StockModule } from '../stock/stock.module';
import { PrismaAuditLogger } from '../common/prisma-audit-logger.service';

@Module({
  imports: [StockModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    {
      provide: 'AuditLogger',
      useClass: PrismaAuditLogger,
    },
  ],
  exports: [OrdersService],
})
export class OrdersModule {}