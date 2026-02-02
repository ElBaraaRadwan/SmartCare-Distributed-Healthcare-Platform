import { Injectable, Logger } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name);
  private redisClient: Redis | null = null;

  private getRedisClient(): Redis {
    if (!this.redisClient) {
      // Create client lazily to avoid startup failures
      this.redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        lazyConnect: true,
        maxRetriesPerRequest: 1, // Reduce retry spam
        enableReadyCheck: false, // Reduce connection noise
      });

      // Handle connection errors gracefully to prevent unhandled exceptions
      this.redisClient.on('error', (error) => {
        // Only log in development, suppress in production to avoid log spam
        if (process.env.NODE_ENV === 'development') {
          this.logger.debug(
            'Redis health check connection error:',
            error.message,
          );
        }
        // Don't throw - health check will handle gracefully
      });

      // Suppress ready events to reduce log noise
      this.redisClient.on('ready', () => {
        if (process.env.NODE_ENV === 'development') {
          this.logger.debug('Redis health check client ready');
        }
      });

      this.redisClient.on('connect', () => {
        if (process.env.NODE_ENV === 'development') {
          this.logger.debug('Redis health check client connected');
        }
      });
    }
    return this.redisClient;
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const client = this.getRedisClient();
      // Test Redis connectivity
      await client.ping();

      return this.getStatus(key, true, {
        responseTime: 'OK',
        connections: 'healthy',
      });
    } catch (error) {
      this.logger.warn('Redis health check failed:', error.message);

      // Don't throw an error - just report unhealthy status
      // This prevents the entire application from failing if Redis is down
      return this.getStatus(key, false, {
        responseTime: 'TIMEOUT',
        connections: 'unhealthy',
        error: error.message,
      });
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}
