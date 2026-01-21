import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { EVENT_TYPES } from '@smartcare/common';

@Injectable()
export class EventConsumerService implements OnModuleInit {
  private subscriber: Redis;
  private readonly logger = new Logger(EventConsumerService.name);

  constructor(
    private configService: ConfigService,
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
      case EVENT_TYPES.PRESCRIPTION_CREATED:
        await this.handlePrescriptionCreated(event.data);
        break;

      default:
        this.logger.debug(`Ignoring event type: ${event.eventType}`);
    }
  }

  private async handlePrescriptionCreated(data: any) {
    this.logger.log(`Processing PRESCRIPTION_CREATED for prescription ${data.prescriptionId}`);

    // For now, just log the event. In a production system, you would:
    // 1. Store the event in a queue/table for processing
    // 2. Use a job scheduler to process orders
    // 3. Or use a message broker pattern

    this.logger.log(`Prescription received: ${JSON.stringify(data)}`);
  }

  async onModuleDestroy() {
    await this.subscriber.quit();
  }
}