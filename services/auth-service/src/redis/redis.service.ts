import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      this.logger.debug(`Fetching key "${key}" from Redis`);
      return (await this.cacheManager.get<T>(key)) || null;
    } catch (error) {
      this.logger.error(`Error getting key "${key}":`, error);
      throw new InternalServerErrorException(`Failed to get key "${key}"`);
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const defaultTTL = parseInt(process.env.DEFAULT_CACHE_TTL || '3600', 10);
    try {
      if (!key) throw new InternalServerErrorException('Key must be provided');
      if (key.includes('/')) {
        this.logger.debug(`Disregarding key "${key}" with invalid characters`);
        return;
      }
      if (value === undefined || value === null)
        throw new InternalServerErrorException(
          'Value must not be null or undefined',
        );

      await this.cacheManager.set(key, value, ttl ?? defaultTTL);
      this.logger.debug(
        `Set key "${key}" in Redis with TTL ${ttl ?? defaultTTL}s`,
      );
    } catch (error) {
      this.logger.error(`Error setting key "${key}":`, error);
      throw new InternalServerErrorException(`Failed to set key "${key}"`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      this.logger.debug(`Deleting key "${key}" from Redis`);
      await this.cacheManager.del(key);
      this.logger.debug(`Key "${key}" deleted from Redis`);
    } catch (error) {
      this.logger.error(`Error deleting key "${key}":`, error);
      throw new InternalServerErrorException(`Failed to delete key "${key}"`);
    }
  }

  // cleanDB method removed for compatibility
}
