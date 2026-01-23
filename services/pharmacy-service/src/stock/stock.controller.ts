import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { StockService } from './stock.service';
import { AuthenticatedGuard } from '@smartcare/common';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { AuditLoggingInterceptor } from '../common/prisma-audit-logger.service';

@Controller('stock')
@UseGuards(AuthenticatedGuard)
@UseInterceptors(AuditLoggingInterceptor)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post()
  async create(@Body() createDto: CreateStockDto) {
    return this.stockService.create(createDto);
  }

  @Get()
  async findAll() {
    return this.stockService.findAll();
  }

  @Get('low-stock')
  async getLowStock() {
    return this.stockService.getLowStock();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.stockService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateStockDto) {
    return this.stockService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.stockService.delete(id);
  }
}