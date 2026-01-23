import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis-health.indicator';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // ✅ Memory usage check
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB

      // ✅ Disk usage check
      () => this.disk.checkStorage('storage', {
        path: '/',
        thresholdPercent: 0.9, // 90% disk usage
      }),

      // ✅ Redis connectivity check
      () => this.redis.isHealthy('redis'),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      // Readiness checks for dependent services
      () => this.redis.isHealthy('redis'),
    ]);
  }
}