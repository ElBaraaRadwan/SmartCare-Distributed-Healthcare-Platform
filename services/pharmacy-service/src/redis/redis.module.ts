import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL');
        const storeConfig = url
          ? { url }
          : {
              socket: {
                host: config.get<string>('REDIS_HOST', 'localhost'),
                port: config.get<number>('REDIS_PORT', 6379),
              },
              password: config.get<string>('REDIS_PASSWORD'),
            };

        return {
          store: await redisStore(storeConfig as any),
        } as any;
      },
    }),
  ],
  exports: [CacheModule, RedisService],
  providers: [RedisService],
})
export class RedisModule {}
