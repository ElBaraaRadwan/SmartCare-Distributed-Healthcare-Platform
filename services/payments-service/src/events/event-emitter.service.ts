import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { EVENT_TYPES, EventEncryption } from '@smartcare/common';

@Injectable()
export class EventEmitterService {
  private publisher: Redis;
  private readonly logger = new Logger(EventEmitterService.name);

  constructor(private config: ConfigService) {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (redisUrl) {
      this.publisher = new Redis(redisUrl);
    } else {
      const redisHost = this.config.get<string>('REDIS_HOST') ?? 'localhost';
      const redisPort = this.config.get<number>('REDIS_PORT') ?? 6379;
      const redisPassword = this.config.get<string>('REDIS_PASSWORD');
      this.publisher = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
      });
    }

    // Initialize event encryption
    const encryptionSecret = this.config.get<string>('EVENT_ENCRYPTION_SECRET');
    const hmacSecret = this.config.get<string>('EVENT_HMAC_SECRET');
    if (!encryptionSecret) {
      throw new Error('EVENT_ENCRYPTION_SECRET is required for event encryption');
    }
    EventEncryption.initialize(encryptionSecret, hmacSecret);

    this.publisher.on('connect', () => {
      this.logger.log('Redis publisher connected');
    });

    this.publisher.on('error', (error) => {
      this.logger.error('Redis publisher error:', error);
    });
  }

  async emit(eventType: string, data: any): Promise<void> {
    const eventId = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Encrypt the event data
    const encryptedData = EventEncryption.encrypt(data);

    const eventPayload = {
      eventId,
      eventType,
      timestamp: new Date().toISOString(),
      data: encryptedData,
    };

    // Create HMAC signature for the entire event payload
    const eventString = JSON.stringify(eventPayload);
    const signature = EventEncryption.sign(eventString);

    const event = {
      ...eventPayload,
      signature, // Add HMAC signature for authenticity
    };

    try {
      await this.publisher.publish('events', JSON.stringify(event));
      this.logger.log(`Event emitted: ${eventType} (${eventId})`);
    } catch (error) {
      this.logger.error(`Failed to emit event ${eventType}:`, error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.publisher.quit();
  }
}
