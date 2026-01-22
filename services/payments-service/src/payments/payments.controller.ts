import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
  Req,
} from '@nestjs/common';
import { Request } from 'express';

interface RawBodyRequest<T = any> extends Request {
  rawBody: Buffer;
}
import { PaymentsService } from './payments.service';
import { StripeService } from '../stripe/stripe.service';
import { AuthenticatedGuard } from '@smartcare/common';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly stripeService: StripeService,
  ) {}



  @Post('checkout')
  @UseGuards(AuthenticatedGuard)
  async createCheckout(@Body() createDto: CreateCheckoutDto) {
    return this.paymentsService.createCheckout(createDto);
  }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async findAll(
    @Query('status') status?: string,
    @Query('orderId') orderId?: string,
  ) {
    return this.paymentsService.findAll({ status, orderId });
  }

  @Get(':id')
  @UseGuards(AuthenticatedGuard)
  async findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody || Buffer.from('');
    
    const event = await this.stripeService.constructWebhookEvent(
      rawBody,
      signature,
    );

    return this.paymentsService.handleWebhook(event);
  }
}