import { Module, Global } from "@nestjs/common";
import { IdempotencyService } from "./idempotency.service";
import { RedisCacheModule } from "../cache/redis-cache.module";

@Global()
@Module({
  imports: [RedisCacheModule],
  providers: [IdempotencyService],
  exports: [IdempotencyService],
})
export class IdempotencyModule {}
