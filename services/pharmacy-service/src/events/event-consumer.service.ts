import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { EVENT_TYPES } from '@smartcare/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventConsumerService implements OnModuleInit {
  private subscriber: Redis;
  private readonly logger = new Logger(EventConsumerService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const redisUrl = this.configService.get('REDIS_URL') || 'redis://localhost:6379';

    // Create a separate connection for subscribing (read-only)
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

    try {
      const { prescriptionId, doctorId, patientId, medications } = data;

      // Check if order already exists
      const existingOrder = await this.prisma.order.findUnique({
        where: { prescriptionId },
      });

      if (existingOrder) {
        this.logger.warn(`Order already exists for prescription ${prescriptionId}`);
        return;
      }

      // Calculate total from medications (using pharmacy stock prices)
      let total = 0;
      const orderItems: Array<{ drugName: string; quantity: number; price: number }> = [];

      for (const med of medications) {
        // Find the medication in stock
        const stock = await this.prisma.stock.findUnique({
          where: { drugName: med.name },
        });

        if (stock) {
          const itemTotal = stock.price * med.quantity;
          total += itemTotal;

          orderItems.push({
            drugName: med.name,
            quantity: med.quantity,
            price: stock.price,
          });
        } else {
          this.logger.warn(`Medication ${med.name} not found in stock`);
        }
      }

      // Create the order
      const order = await this.prisma.order.create({
        data: {
          prescriptionId,
          pharmacyId: 'default-pharmacy-001', // In production, this would be dynamic
          status: 'PENDING',
          total,
          medications: {
            create: orderItems,
          },
        },
        include: {
          medications: true,
        },
      });

      this.logger.log(`✅ Order created: ${order.id} for prescription ${prescriptionId} (Total: $${total})`);

    } catch (error) {
      this.logger.error(`Failed to create order for prescription ${data.prescriptionId}:`, error);
    }
  }

  async onModuleDestroy() {
    await this.subscriber.quit();
  }
}