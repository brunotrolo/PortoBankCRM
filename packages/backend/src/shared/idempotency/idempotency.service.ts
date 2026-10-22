import { Injectable, ConflictException } from "@nestjs/common";
import { RedisCacheService } from "../cache/redis-cache.service";

const IDEMPOTENCY_TTL_SECONDS = 86400; // 24h

@Injectable()
export class IdempotencyService {
  constructor(private readonly redis: RedisCacheService) {}

  async isDuplicate(
    idempotencyKey: string,
    organizationId: string,
    endpoint: string
  ): Promise<boolean> {
    const cacheKey = `idempotency:${organizationId}:${endpoint}:${idempotencyKey}`;
    const existing = await this.redis.get<string>(cacheKey);
    return !!existing;
  }

  async checkAndRegister(
    idempotencyKey: string,
    organizationId: string,
    endpoint: string,
    requestHash: string
  ): Promise<void> {
    const isDuplicate = await this.isDuplicate(
      idempotencyKey,
      organizationId,
      endpoint
    );
    if (isDuplicate) {
      throw new ConflictException(
        "Requisição duplicada - chave de idempotência já processada"
      );
    }

    const cacheKey = `idempotency:${organizationId}:${endpoint}:${idempotencyKey}`;
    await this.redis.set(cacheKey, requestHash, IDEMPOTENCY_TTL_SECONDS);
  }
}
