import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LeadsModule } from "./modules/leads/leads.module";
import { RedisCacheModule } from "./shared/cache/redis-cache.module";
import { CircuitBreakerModule } from "./shared/resilience/circuit-breaker.module";
import { IdempotencyModule } from "./shared/idempotency/idempotency.module";
import { HealthModule } from "./modules/health/health.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AiAgentModule } from "./modules/ai-agent/ai-agent.module";
import { AutomationModule } from "./modules/automation/automation.module";
import { ConversationsModule } from "./modules/conversations/conversations.module";
import { MessagesModule } from "./modules/messages/messages.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";
import { LgpdModule } from "./modules/lgpd/lgpd.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    RedisCacheModule,
    CircuitBreakerModule,
    IdempotencyModule,
    OrganizationsModule,
    AuthModule,
    LeadsModule,
    ConversationsModule,
    MessagesModule,
    AiAgentModule,
    AutomationModule,
    WebhooksModule,
    LgpdModule,
    HealthModule,
  ],
})
export class AppModule {}
