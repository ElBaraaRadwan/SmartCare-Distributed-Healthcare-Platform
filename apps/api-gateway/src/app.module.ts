import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import Redis from 'ioredis';
import { AuthModule } from './auth/auth.module';
import { ProxyModule } from './proxy/proxy.module';
import { HealthModule } from './health/health.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Distributed Rate Limiting with Redis
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        let redisClient: Redis | undefined;

        try {
          // Try to create Redis client for rate limiting
          redisClient = new Redis({
            host: config.get<string>('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
            password: config.get<string>('REDIS_PASSWORD'),
            lazyConnect: true,
            maxRetriesPerRequest: 3, // Allow some retries but not infinite
            enableReadyCheck: false,
          });

          // Handle Redis errors gracefully to prevent unhandled exceptions
          redisClient.on('error', (error) => {
            // Silently handle Redis errors - rate limiting will fall back to memory
            if (process.env.NODE_ENV !== 'test') {
              console.warn('Redis rate limiting error (falling back to memory):', error.message);
            }
          });

          redisClient.on('connect', () => {
            console.log('✅ Redis connected for rate limiting');
          });

          // Test connection
          await redisClient.ping();
        } catch (error) {
          console.warn('Redis not available for rate limiting, falling back to memory storage:', error.message);
          redisClient = undefined;
        }

        return {
          throttlers: [
            {
              name: 'default',
              ttl: 60000, // 1 minute
              limit: 50, // ✅ Reduced from 100 for healthcare security
            },
            {
              name: 'auth',
              ttl: 60000,
              limit: 3, // ✅ Very restrictive for auth endpoints
            },
            {
              name: 'upload',
              ttl: 60000,
              limit: 5, // ✅ Restrictive for file uploads
            },
          ],
          storage: redisClient
            ? new ThrottlerStorageRedisService(redisClient)
            : undefined, // Falls back to memory storage if Redis unavailable
        };
      },
    }),
    AuthModule,
    ProxyModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
