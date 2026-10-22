/**
 * Porto Bank CRM — Schema do Banco de Dados (Drizzle ORM)
 * Padrão AWS: Aurora PostgreSQL Serverless v2 + RDS Proxy
 * Multi-tenant com RLS, UUID v7, dinheiro em numeric(19,4)
 */

import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  numeric,
  boolean,
  jsonb,
  integer,
  bigint,
  pgEnum,
  serial,
} from "drizzle-orm/pg-core";

// =============================================================================
// ENUMS
// =============================================================================

export const organizationStatusEnum = pgEnum("organization_status", [
  "active",
  "suspended",
  "redacted",
  "archived",
]);

export const leadStatusEnum = pgEnum("lead_status", ["open", "won", "lost"]);

export const conversationStatusEnum = pgEnum("conversation_status", [
  "open",
  "pending",
  "resolved",
  "claimed",
  "ai_handling",
  "closed",
  "archived",
]);

export const messageDirectionEnum = pgEnum("message_direction", [
  "inbound",
  "outbound",
]);

export const messageTypeEnum = pgEnum("message_type", [
  "text",
  "image",
  "video",
  "audio",
  "document",
  "sticker",
  "location",
  "contact",
  "reaction",
  "system",
]);

export const channelSessionEngineEnum = pgEnum("channel_session_engine", [
  "NOWEB",
  "WEBJS",
]);

export const channelSessionStatusEnum = pgEnum("channel_session_status", [
  "STARTING",
  "SCAN_QR_CODE",
  "WORKING",
  "STOPPED",
  "FAILED",
]);

export const eventLogStatusEnum = pgEnum("event_log_status", [
  "pending",
  "processing",
  "done",
  "dead",
]);

export const aiAgentKindEnum = pgEnum("ai_agent_kind", ["rag_bot", "mcp_agent"]);

export const aiAgentRunStatusEnum = pgEnum("ai_agent_run_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "aborted",
  "handoff",
]);

export const invocationKindEnum = pgEnum("invocation_kind", [
  "bot_respond",
  "sentiment_classify",
  "triage_classify",
  "embedding_generate",
]);

export const lgpdRequestTypeEnum = pgEnum("lgpd_request_type", [
  "data_request",
  "redact",
  "store_redact",
]);

export const lgpdRequestStatusEnum = pgEnum("lgpd_request_status", [
  "received",
  "processing",
  "completed",
  "failed",
  "expired",
]);

export const userRoleEnum = pgEnum("user_role", [
  "viewer",
  "agent",
  "manager",
  "admin",
]);

export const platformAdminScopeEnum = pgEnum("platform_admin_scope", [
  "full",
  "support_readonly",
]);

export const integrationProviderEnum = pgEnum("integration_provider", [
  "nuvemshop",
  "vtex",
  "shopify",
]);

export const integrationStatusEnum = pgEnum("integration_status", [
  "connecting",
  "healthy",
  "token_expired",
  "scope_missing",
  "disconnected",
  "rate_limited",
  "error",
]);

export const storageRedactionStatusEnum = pgEnum("storage_redaction_status", [
  "pending",
  "deleted",
  "failed",
  "skipped",
]);

// =============================================================================
// TABELAS
// =============================================================================

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  legalName: text("legal_name").notNull(),
  displayName: text("display_name").notNull(),
  cnpj: text("cnpj"),
  status: organizationStatusEnum("status").notNull().default("active"),
  timezone: text("timezone").notNull().default("America/Sao_Paulo"),
  locale: text("locale").notNull().default("pt-BR"),
  rateLimitRps: integer("rate_limit_rps").notNull().default(100),
  aiBudgetCents: bigint("ai_budget_cents", { mode: "number" }),
  mediaRetentionDays: integer("media_retention_days").notNull().default(365),
  settings: jsonb("settings").notNull().default({}),
  dpoEmail: text("dpo_email"),
  privacyPolicyUrl: text("privacy_policy_url"),
  onboardedAt: timestamp("onboarded_at"),
  suspendedAt: timestamp("suspended_at"),
  redactedAt: timestamp("redacted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: uuid("created_by"),
  onboardingState: jsonb("onboarding_state").notNull().default({}),
  suspendedReason: text("suspended_reason"),
  suspendedBy: uuid("suspended_by"),
});

export const userOrganizations = pgTable("user_organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  role: userRoleEnum("role").notNull(),
  invitedBy: uuid("invited_by"),
  invitedAt: timestamp("invited_at"),
  acceptedAt: timestamp("accepted_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const platformAdmins = pgTable("platform_admins", {
  userId: uuid("user_id").notNull().primaryKey(),
  grantedBy: uuid("granted_by").notNull(),
  grantedAt: timestamp("granted_at").notNull().defaultNow(),
  scope: platformAdminScopeEnum("scope").notNull().default("full"),
  mfaRequired: boolean("mfa_required").notNull().default(true),
  reason: text("reason").notNull(),
  revokedAt: timestamp("revoked_at"),
  revokedBy: uuid("revoked_by"),
  revokeReason: text("revoke_reason"),
});

export const crmPipelines = pgTable("crm_pipelines", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 40 }).notNull(),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  position: numeric("position").notNull().default("1000"),
  vocabulary: jsonb("vocabulary").notNull().default({
    lead: "Cliente",
    lead_plural: "Clientes",
    deal: "Pedido",
    deal_plural: "Pedidos",
    won: "Pago",
    lost: "Cancelado",
    stage: "Etapa",
    stage_plural: "Etapas",
  }),
  settings: jsonb("settings").notNull().default({
    fields: [],
    canonical_tags: [],
    lost_reasons: [],
    identity_resolution: {
      fields_in_priority_order: ["cpf", "phone_e164", "email"],
    },
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const crmStages = pgTable("crm_stages", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  pipelineId: uuid("pipeline_id").notNull(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 40 }).notNull(),
  description: text("description"),
  position: numeric("position").notNull(),
  color: text("color"),
  isWon: boolean("is_won").notNull().default(false),
  isLost: boolean("is_lost").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  expectedDurationHours: numeric("expected_duration_hours"),
  requiresHuman: boolean("requires_human").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const crmLeads = pgTable("crm_leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  pipelineId: uuid("pipeline_id").notNull(),
  stageId: uuid("stage_id").notNull(),
  contactId: uuid("contact_id"),
  title: text("title").notNull(),
  description: text("description"),
  status: leadStatusEnum("status").notNull().default("open"),
  lostReason: text("lost_reason"),
  positionInStage: numeric("position_in_stage").notNull().default("1000"),
  valueCents: bigint("value_cents", { mode: "number" }),
  currency: text("currency").notNull().default("BRL"),
  ownerUserId: uuid("owner_user_id"),
  assignedAt: timestamp("assigned_at"),
  lastActivityAt: timestamp("last_activity_at"),
  expectedCloseDate: timestamp("expected_close_date"),
  closedAt: timestamp("closed_at"),
  source: text("source").notNull().default("manual"),
  sourceMetadata: jsonb("source_metadata").notNull().default({}),
  externalId: text("external_id"),
  customFields: jsonb("custom_fields").notNull().default({}),
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdByUserId: uuid("created_by_user_id"),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  name: text("name"),
  displayName: text("display_name"),
  email: text("email"),
  emailNormalized: text("email_normalized"),
  phoneNumber: text("phone_number"),
  cpfEncrypted: text("cpf_encrypted"),
  cpfHash: text("cpf_hash"),
  birthdate: timestamp("birthdate"),
  isBlocked: boolean("is_blocked").notNull().default(false),
  blockedReason: text("blocked_reason"),
  blockedAt: timestamp("blocked_at"),
  isAnonymized: boolean("is_anonymized").notNull().default(false),
  anonymizedAt: timestamp("anonymized_at"),
  isMergedInto: uuid("is_merged_into"),
  mergedAt: timestamp("merged_at"),
  consent: jsonb("consent").notNull().default({
    marketing: { granted_at: null, source: null, version: null },
    transactional: { granted_at: null, source: null, version: null },
    profiling: { granted_at: null, source: null, version: null },
  }),
  tags: text("tags").array().notNull().default([]),
  source: text("source").notNull().default("manual"),
  sourceMetadata: jsonb("source_metadata").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdByUserId: uuid("created_by_user_id"),
  lastActivityAt: timestamp("last_activity_at"),
  forceHuman: boolean("force_human").notNull().default(false),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  contactId: uuid("contact_id").notNull(),
  channelSessionId: uuid("channel_session_id").notNull(),
  channel: text("channel").notNull().default("whatsapp"),
  status: conversationStatusEnum("status").notNull().default("open"),
  statusChangedAt: timestamp("status_changed_at").notNull().defaultNow(),
  assignedToUserId: uuid("assigned_to_user_id"),
  assignedAt: timestamp("assigned_at"),
  lastInboundAt: timestamp("last_inbound_at"),
  lastOutboundAt: timestamp("last_outbound_at"),
  lastMessageAt: timestamp("last_message_at"),
  lastMessagePreview: text("last_message_preview"),
  unreadCountForAssignee: integer("unread_count_for_assignee").notNull().default(0),
  isGroup: boolean("is_group").notNull().default(false),
  groupChatId: text("group_chat_id"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  botSilencedUntil: timestamp("bot_silenced_until"),
  lastHandoffAt: timestamp("last_handoff_at"),
  lastHandoffReason: text("last_handoff_reason"),
  usableForRag: boolean("usable_for_rag").notNull().default(false),
  usableForRagMarkedAt: timestamp("usable_for_rag_marked_at"),
  usableForRagMarkedBy: uuid("usable_for_rag_marked_by"),
  ragReviewStatus: text("rag_review_status"),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  conversationId: uuid("conversation_id").notNull(),
  channelSessionId: uuid("channel_session_id").notNull(),
  contactId: uuid("contact_id").notNull(),
  externalId: text("external_id"),
  type: messageTypeEnum("type").notNull(),
  direction: messageDirectionEnum("direction").notNull(),
  status: text("status").notNull().default("received"),
  ack: integer("ack"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  body: text("body"),
  mediaUrl: text("media_url"),
  mediaMime: text("media_mime"),
  mediaSizeBytes: bigint("media_size_bytes", { mode: "number" }),
  mediaStoragePath: text("media_storage_path"),
  sentVia: text("sent_via").notNull().default("crm"),
  sentByUserId: uuid("sent_by_user_id"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  metadata: jsonb("metadata").notNull().default({}),
  activityId: uuid("activity_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const channelSessions = pgTable("channel_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  wahaSessionName: text("waha_session_name").notNull(),
  engine: channelSessionEngineEnum("engine").notNull().default("NOWEB"),
  webhookPathToken: text("webhook_path_token").notNull(),
  webhookSecretEncrypted: text("webhook_secret_encrypted").notNull(),
  status: channelSessionStatusEnum("status").notNull().default("STARTING"),
  statusReason: text("status_reason"),
  phoneNumber: text("phone_number"),
  displayName: text("display_name"),
  lastHealthCheckAt: timestamp("last_health_check_at"),
  lastStatusChangeAt: timestamp("last_status_change_at").notNull().defaultNow(),
  consecutiveHealthFails: integer("consecutive_health_fails").notNull().default(0),
  dailyMessageLimit: integer("daily_message_limit").notNull().default(300),
  warmupStartedAt: timestamp("warmup_started_at"),
  warmupCompletedAt: timestamp("warmup_completed_at"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: uuid("created_by"),
});

export const eventLog = pgTable("event_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  eventType: text("event_type").notNull(),
  entityKind: text("entity_kind").notNull(),
  entityId: uuid("entity_id"),
  payload: jsonb("payload").notNull().default({}),
  metadata: jsonb("metadata").notNull().default({}),
  consumedBy: text("consumed_by").array().notNull().default([]),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  nextAttemptAt: timestamp("next_attempt_at"),
  status: eventLogStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const aiAgents = pgTable("ai_agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  model: text("model").notNull().default("anthropic/claude-sonnet-4-6"),
  systemPrompt: text("system_prompt").notNull(),
  config: jsonb("config").notNull().default({
    temperature: 0.3,
    max_tokens: 1024,
    rag_top_k: 5,
    rag_similarity_threshold: 0.72,
    context_message_window: 20,
    confidence_threshold: 0.55,
    sentiment_threshold: 0.3,
    zero_data_retention: false,
  }),
  guardrails: jsonb("guardrails").notNull().default([]),
  activeKbVersionId: uuid("active_kb_version_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: uuid("created_by"),
  publishedVersionId: uuid("published_version_id"),
  priority: integer("priority").notNull().default(0),
  archivedAt: timestamp("archived_at"),
  kind: aiAgentKindEnum("kind").notNull().default("rag_bot"),
});

export const aiBudgets = pgTable("ai_budgets", {
  organizationId: uuid("organization_id").notNull().primaryKey(),
  monthlyLimitCents: integer("monthly_limit_cents").notNull().default(5000),
  actionAt100pct: text("action_at_100pct").notNull().default("throttle"),
  alarmThresholdPct: integer("alarm_threshold_pct").notNull().default(80),
  currentMonthConsumedCents: numeric("current_month_consumed_cents", {
    precision: 12,
    scale: 4,
  }).notNull().default("0"),
  currentPeriodStart: timestamp("current_period_start").notNull().defaultNow(),
  lastAlarmSentAt: timestamp("last_alarm_sent_at"),
  isThrottled: boolean("is_throttled").notNull().default(false),
});

export const aiAgentRuns = pgTable("ai_agent_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  agentId: uuid("agent_id").notNull(),
  agentVersionId: uuid("agent_version_id").notNull(),
  conversationId: uuid("conversation_id"),
  contactId: uuid("contact_id"),
  channelSessionId: uuid("channel_session_id"),
  inboundMessageId: uuid("inbound_message_id"),
  outboundMessageId: uuid("outbound_message_id"),
  status: aiAgentRunStatusEnum("status").notNull().default("pending"),
  abortReason: text("abort_reason"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  tokensIn: integer("tokens_in").notNull().default(0),
  tokensOut: integer("tokens_out").notNull().default(0),
  costCents: numeric("cost_cents", { precision: 10, scale: 4 }).notNull().default("0"),
  latencyMs: integer("latency_ms"),
  stepsCount: integer("steps_count").notNull().default(0),
  toolCalls: jsonb("tool_calls").notNull().default([]),
  isDryRun: boolean("is_dry_run").notNull().default(false),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiInvocations = pgTable("ai_invocations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  agentId: uuid("agent_id").notNull(),
  conversationId: uuid("conversation_id"),
  messageId: uuid("message_id"),
  invocationKind: invocationKindEnum("invocation_kind").notNull(),
  model: text("model").notNull(),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  latencyMs: integer("latency_ms").notNull(),
  costCents: numeric("cost_cents", { precision: 10, scale: 4 }).notNull().default("0"),
  finishReason: text("finish_reason"),
  citations: jsonb("citations").notNull().default([]),
  promptBlobPath: text("prompt_blob_path"),
  responseBlobPath: text("response_blob_path"),
  errorPayload: jsonb("error_payload"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiKnowledgeSources = pgTable("ai_knowledge_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  agentId: uuid("agent_id").notNull(),
  sourceType: text("source_type").notNull(),
  sourceMetadata: jsonb("source_metadata").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  lastIndexedAt: timestamp("last_indexed_at"),
  lastIndexStatus: text("last_index_status"),
  lastIndexError: text("last_index_error"),
  chunksCount: integer("chunks_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  name: text("name").notNull().default(""),
  status: text("status").notNull().default("ready"),
  ingestedAt: timestamp("ingested_at"),
});

export const lgpdRequests = pgTable("lgpd_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  requestType: lgpdRequestTypeEnum("request_type").notNull(),
  source: text("source").notNull(),
  contactId: uuid("contact_id"),
  externalCustomerId: text("external_customer_id"),
  status: lgpdRequestStatusEnum("status").notNull().default("received"),
  attempts: integer("attempts").notNull().default(0),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
  dueAt: timestamp("due_at").notNull(),
  completedAt: timestamp("completed_at"),
  requestPayload: jsonb("request_payload").notNull().default({}),
  result: jsonb("result"),
  errorMessage: text("error_message"),
  cascadedTo: jsonb("cascaded_to"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  emergency: boolean("emergency").notNull().default(false),
  scope: text("scope").notNull().default("contact"),
});

export const storageRedactionQueue = pgTable("storage_redaction_queue", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  requestId: uuid("request_id"),
  bucket: text("bucket").notNull(),
  objectPath: text("object_path").notNull(),
  status: storageRedactionStatusEnum("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  errorMessage: text("error_message"),
  enqueuedAt: timestamp("enqueued_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const apiTokens = pgTable("api_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  createdBy: uuid("created_by").notNull(),
  name: text("name").notNull(),
  prefix: text("prefix").notNull(),
  tokenHash: text("token_hash").notNull(),
  scopes: jsonb("scopes").notNull().default([]),
  lastUsedAt: timestamp("last_used_at"),
  lastUsedIp: text("last_used_ip"),
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  revokedBy: uuid("revoked_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const webhookEventsLog = pgTable("webhook_events_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id"),
  channelSessionId: uuid("channel_session_id"),
  provider: text("provider").notNull().default("waha"),
  webhookPathToken: text("webhook_path_token"),
  httpMethod: text("http_method").notNull().default("POST"),
  headers: jsonb("headers"),
  rawBody: text("raw_body").notNull(),
  payloadParsed: jsonb("payload_parsed"),
  signatureHeader: text("signature_header"),
  validSignature: boolean("valid_signature"),
  eventType: text("event_type"),
  externalId: text("external_id"),
  status: text("status").notNull().default("received"),
  attempts: integer("attempts").notNull().default(0),
  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at"),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
  archivedAt: timestamp("archived_at"),
});

export const tenantIntegrations = pgTable("tenant_integrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  provider: integrationProviderEnum("provider").notNull(),
  oauthAccessTokenEncrypted: text("oauth_access_token_encrypted").notNull(),
  oauthRefreshTokenEncrypted: text("oauth_refresh_token_encrypted"),
  scopes: text("scopes").array().notNull().default([]),
  expiresAt: timestamp("expires_at"),
  status: integrationStatusEnum("status").notNull().default("connecting"),
  statusReason: text("status_reason"),
  storeMetadata: jsonb("store_metadata").notNull().default({}),
  webhookPathToken: text("webhook_path_token").notNull(),
  webhookSecretEncrypted: text("webhook_secret_encrypted").notNull(),
  webhookSubscriptions: jsonb("webhook_subscriptions").notNull().default([]),
  lastSyncAt: timestamp("last_sync_at"),
  lastHealthCheckAt: timestamp("last_health_check_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const nuvemshopProducts = pgTable("nuvemshop_products", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  externalId: text("external_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  priceCents: bigint("price_cents", { mode: "number" }).notNull(),
  availableQty: integer("available_qty").notNull().default(0),
  url: text("url"),
  imageUrl: text("image_url"),
  ragIndexedAt: timestamp("rag_indexed_at"),
  ragChunkCount: integer("rag_chunk_count").notNull().default(0),
  payload: jsonb("payload").notNull().default({}),
  lastUpdatedAt: timestamp("last_updated_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const crmLeadActivities = pgTable("crm_lead_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  leadId: uuid("lead_id").notNull(),
  contactId: uuid("contact_id"),
  sourceModule: text("source_module").notNull(),
  sourceId: uuid("source_id"),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull().default({}),
  metadata: jsonb("metadata").notNull().default({}),
  performedAt: timestamp("performed_at").notNull().defaultNow(),
  performedByUserId: uuid("performed_by_user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const idempotencyKeys = pgTable("idempotency_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  key: text("key").notNull(),
  endpoint: text("endpoint").notNull(),
  requestHash: text("request_hash").notNull(),
  statusCode: integer("status_code"),
  responseBody: jsonb("response_body"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userRecoveryCodes = pgTable("user_recovery_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  codeHash: text("code_hash").notNull(),
  usedAt: timestamp("used_at"),
  usedIp: text("used_ip"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const automationRules = pgTable("automation_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  conditions: jsonb("conditions").notNull().default({}),
  actions: jsonb("actions").notNull().default({}),
  triggerType: text("trigger_type").notNull(),
  triggerConfig: jsonb("trigger_config").notNull().default({}),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
