import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { createClient, RedisClientType } from "redis";

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: RedisClientType | null = null;
  private connected = false;

  async onModuleInit() {
    await this.connect(process.env.REDIS_URL || "redis://localhost:6379");
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  async connect(url: string): Promise<void> {
    try {
      this.client = createClient({ url });
      this.client.on("error", (err) => this.logger.error("Redis error", err));
      await this.client.connect();
      this.connected = true;
      this.logger.log("Redis conectado");
    } catch (err) {
      this.logger.error("Falha ao conectar Redis", err);
      this.connected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.connected || !this.client) return null;
    const raw = await this.client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.connected || !this.client) return;
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.setEx(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.connected || !this.client) return;
    await this.client.del(key);
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (!this.connected || !this.client) return 0;
    const value = await this.client.incr(key);
    if (ttlSeconds && value === 1) {
      await this.client.expire(key, ttlSeconds);
    }
    return value;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
