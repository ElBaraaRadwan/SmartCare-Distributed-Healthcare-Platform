import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { EventEmitterService } from '../events/event-emitter.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { EVENT_TYPES } from '@smartcare/common';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
    private eventEmitter: EventEmitterService,
    private configService: ConfigService,
  ) {}

  async createPaymentForOrder(orderData: any) {
    const { orderId, total } = orderData;

    // Check if payment already exists
    const existing = await this.prisma.payment.findUnique({
      where: { orderId },
    });

    if (existing) {
      this.logger.warn(`Payment already exists for order ${orderId}`);
      return existing;
    }

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        amount: total,
        currency: 'usd',
        status: 'PENDING',
      },
    });

    this.logger.log(
      `Payment record created: ${payment.id} for order ${orderId} ($${total})`,
    );
    return payment;
  }

  async createCheckout(dto: CreateCheckoutDto) {
    // Find or create payment
    let payment = await this.prisma.payment.findUnique({
      where: { orderId: dto.orderId },
    });

    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          orderId: dto.orderId,
          amount: dto.amount,
          currency: dto.currency || 'usd',
          status: 'PENDING',
          customerEmail: dto.customerEmail,
        },
      });
    }

    if (payment.status === 'COMPLETED') {
      throw new ConflictException('Payment already completed');
    }

    // Create Stripe checkout session
    const successUrl =
      this.configService.get('STRIPE_SUCCESS_URL') ||
      `${this.configService.get('FRONTEND_URL')}/payment/success?session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl =
      this.configService.get('STRIPE_CANCEL_URL') ||
      `${this.configService.get('FRONTEND_URL')}/payment/cancel`;

    const session = await this.stripeService.createCheckoutSession({
      orderId: dto.orderId,
      amount: dto.amount,
      currency: dto.currency || 'usd',
      customerEmail: dto.customerEmail,
      successUrl,
      cancelUrl,
    });

    // Update payment with Stripe session ID
    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        stripeSessionId: session.id,
        status: 'PROCESSING',
      },
    });

    this.logger.log(
      `Checkout session created: ${session.id} for payment ${payment.id}`,
    );

    return {
      paymentId: updated.id,
      sessionId: session.id,
      url: session.url,
    };
  }

  async findAll(filters?: { status?: string; orderId?: string }) {
    return this.prisma.payment.findMany({
      where: {
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.orderId && { orderId: filters.orderId }),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }

    return payment;
  }

  async findByOrderId(orderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment for order ${orderId} not found`);
    }

    return payment;
  }

  async handleWebhook(event: Stripe.Event) {
    this.logger.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;

      case 'payment_intent.succeeded':
        this.logger.log('Payment intent succeeded');
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;

      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const payment = await this.prisma.payment.findUnique({
      where: { stripeSessionId: session.id },
    });

    if (!payment) {
      this.logger.error(`Payment not found for session ${session.id}`);
      return;
    }

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        stripePaymentId: session.payment_intent as string,
        metadata: session as any,
      },
    });

    // Emit PAYMENT_CONFIRMED event
    await this.eventEmitter.emit(EVENT_TYPES.PAYMENT_CONFIRMED, {
      paymentId: updated.id,
      orderId: updated.orderId,
      amount: updated.amount,
      currency: updated.currency,
      stripeSessionId: updated.stripeSessionId,
    });

    this.logger.log(
      `✓ Payment completed: ${updated.id} for order ${updated.orderId}`,
    );
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const payment = await this.prisma.payment.findUnique({
      where: { stripePaymentId: paymentIntent.id },
    });

    if (!payment) {
      this.logger.error(
        `Payment not found for payment intent ${paymentIntent.id}`,
      );
      return;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        metadata: paymentIntent as any,
      },
    });

    this.logger.error(
      `✗ Payment failed: ${payment.id} for order ${payment.orderId}`,
    );
  }
}
