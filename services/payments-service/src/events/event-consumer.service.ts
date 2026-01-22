import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PaymentsService } from '../payments/payments.service';
import { EVENT_TYPES } from '@smartcare/common';

@Injectable()
export class EventConsumerService implements OnModuleInit {
  private subscriber: Redis;
  private readonly logger = new Logger(EventConsumerService.name);

  constructor(
    private configService: ConfigService,
    private paymentsService: PaymentsService,
  ) {
    const redisUrl = this.configService.get('REDIS_URL') || 'redis://localhost:6379';
    this.subscriber = new Redis(redisUrl);

    this.subscriber.on('connect', () => {
      this.logger.log('Redis subscriber connected');
    });

    this.subscriber.on('error', (error) => {
      this.logger.error('Redis subscriber error:', error);
    });
  }

  async onModuleInit() {
    await this.subscriber.subscribe('events', (err, count) => {
      if (err) {
        this.logger.error('Failed to subscribe to events channel:', err);
      } else {
        this.logger.log(`Subscribed to ${count} channel(s)`);
      }
    });

    this.subscriber.on('message', async (channel, message) => {
      try {
        const event = JSON.parse(message);
        await this.handleEvent(event);
      } catch (error) {
        this.logger.error('Error processing event:', error);
      }
    });
  }

  private async handleEvent(event: any) {
    this.logger.log(`Received event: ${event.eventType} (${event.eventId})`);

    switch (event.eventType) {
      case EVENT_TYPES.ORDER_CONFIRMED:
        await this.handleOrderConfirmed(event.data);
        break;

      default:
        this.logger.debug(`Ignoring event type: ${event.eventType}`);
    }
  }

  private async handleOrderConfirmed(data: any) {
    this.logger.log(`Processing ORDER_CONFIRMED for order ${data.orderId}`);

    try {
      // Auto-create payment record when order is confirmed
      const payment = await this.paymentsService.createPaymentForOrder(data);
      this.logger.log(`Payment created: ${payment.id} for order ${data.orderId}`);
    } catch (error) {
      this.logger.error(`Failed to create payment for order ${data.orderId}:`, error);
    }
  }

  async onModuleDestroy() {
    await this.subscriber.quit();
  }
}