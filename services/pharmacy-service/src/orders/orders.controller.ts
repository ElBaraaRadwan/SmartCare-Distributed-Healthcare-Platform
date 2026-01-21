import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  AuthenticatedGuard,
  CurrentUser,
} from '@smartcare/common';
import type { IAuthenticatedUser } from '@smartcare/common';
import { ConfirmOrderDto } from './dto/confirm-order.dto';

@Controller('orders')
@UseGuards(AuthenticatedGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async findAll(
    @Query('pharmacyId') pharmacyId?: string,
    @Query('status') status?: string,
  ) {
    return this.ordersService.findAll({ pharmacyId, status });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Post(':id/confirm')
  async confirm(
    @Param('id') id: string,
    @Body() confirmDto: ConfirmOrderDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.ordersService.confirm(id, confirmDto, user);
  }

  @Delete(':id')
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.ordersService.cancel(id, user);
  }
}