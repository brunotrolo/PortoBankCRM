import { Controller, Get } from "@nestjs/common";
import { RedisCacheService } from "../shared/cache/redis-cache.service";
import { CircuitBreakerService } from "../shared/resilience/circuit-breaker.service";

@Controller("health")
export class HealthController {
  constructor(
    private readonly redis: RedisCacheService,
    private readonly circuitBreaker: CircuitBreakerService
  ) {}

  @Get()
  async check() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        redis: this.redis.isConnected() ? "up" : "down",
        circuitBreaker: {
          llm: this.circuitBreaker.getState("llm"),
          waha: this.circuitBreaker.getState("waha"),
        },
      },
    };
  }

  @Get("ready")
  async ready() {
    return { status: "ready" };
  }

  @Get("live")
  async live() {
    return { status: "live" };
  }
}
