import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class EventEmitterService {
  private publisher: Redis;
  private readonly logger = new Logger(EventEmitterService.name);

  constructor(private config: ConfigService) {
    const redisUrl: string = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.publisher = new Redis(redisUrl);

    this.publisher.on('connect', () => {
      this.logger.log('Redis publisher connected');
    });

    this.publisher.on('error', (error) => {
      this.logger.error('Redis publisher error:', error);
    });
  }

  async emit(eventType: string, data: any): Promise<void> {
    const event = {
      eventId: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    try {
      await this.publisher.publish('events', JSON.stringify(event));
      this.logger.log(`Event emitted: ${eventType} (${event.eventId})`);
    } catch (error) {
      this.logger.error(`Failed to emit event ${eventType}:`, error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.publisher.quit();
  }
}
