import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { RedisCacheService } from "../shared/cache/redis-cache.service";
import { CircuitBreakerService } from "../shared/resilience/circuit-breaker.service";

@Module({
  controllers: [HealthController],
  providers: [RedisCacheService, CircuitBreakerService],
})
export class HealthModule {}
