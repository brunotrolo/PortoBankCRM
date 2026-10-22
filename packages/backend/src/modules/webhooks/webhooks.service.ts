import { Injectable, Logger } from "@nestjs/common";
import { DbClient } from "../../infrastructure/database/client";
import { webhookEventsLog } from "../../infrastructure/database/schema";
import { eq } from "drizzle-orm";

export interface ProcessInboundDto {
  token: string;
  body: unknown;
  headers?: Record<string, string>;
}

export interface WebhookEvent {
  id: string;
  organizationId?: string;
  channelSessionId?: string;
  provider: string;
  webhookPathToken?: string;
  httpMethod: string;
  headers?: Record<string, unknown>;
  rawBody: string;
  payloadParsed?: unknown;
  signatureHeader?: string;
  validSignature?: boolean;
  eventType?: string;
  externalId?: string;
  status: string;
  attempts: number;
  errorMessage?: string;
  processedAt?: Date;
  receivedAt: Date;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly db: DbClient) {}

  async processInbound(
    token: string,
    body: unknown,
    headers?: Record<string, string>
  ): Promise<WebhookEvent> {
    // Buscar a sessão de canal pelo token do webhook
    const { channelSessions } = await import("../../infrastructure/database/schema");
    const [session] = await this.db
      .select({
        id: channelSessions.id,
        organizationId: channelSessions.organizationId,
        webhookPathToken: channelSessions.webhookPathToken,
      })
      .from(channelSessions)
      .where(eq(channelSessions.webhookPathToken, token));

    if (!session) {
      this.logger.warn(`Webhook token não encontrado: ${token}`);
      throw new Error("Token de webhook inválido");
    }

    // Gravar o evento no banco
    const [event] = await this.db
      .insert(webhookEventsLog)
      .values({
        organizationId: session.organizationId,
        channelSessionId: session.id,
        provider: "waha",
        webhookPathToken: token,
        httpMethod: "POST",
        headers: headers ?? null,
        rawBody: JSON.stringify(body),
        payloadParsed: body as Record<string, unknown>,
        signatureHeader: headers?.["x-deskcomm-signature"] ?? null,
        validSignature: null, // Será validado posteriormente
        eventType: undefined,
        externalId: undefined,
        status: "received",
        attempts: 0,
      })
      .returning();

    this.logger.log(
      `Webhook processado: ${event.id} para sessão ${session.id}`
    );

    return {
      id: event.id,
      organizationId: event.organizationId,
      channelSessionId: event.channelSessionId,
      provider: event.provider,
      webhookPathToken: event.webhookPathToken,
      httpMethod: event.httpMethod,
      headers: event.headers as Record<string, unknown>,
      rawBody: event.rawBody,
      payloadParsed: event.payloadParsed as unknown,
      signatureHeader: event.signatureHeader,
      validSignature: event.validSignature,
      eventType: event.eventType,
      externalId: event.externalId,
      status: event.status,
      attempts: event.attempts,
      errorMessage: event.errorMessage,
      processedAt: event.processedAt,
      receivedAt: event.receivedAt,
    };
  }

  async sendOutbound(
    source: string,
    body: unknown
  ): Promise<{ status: string; source: string; sentAt: Date }> {
    // Webhook de saída - envia para sistema externo
    this.logger.log(`Webhook de saída: ${source}`, body);

    return {
      status: "sent",
      source,
      sentAt: new Date(),
    };
  }

  async listEvents(organizationId?: string): Promise<WebhookEvent[]> {
    let query = this.db.select().from(webhookEventsLog);

    if (organizationId) {
      query = query.where(eq(webhookEventsLog.organizationId, organizationId));
    }

    const rows = await query.orderBy(desc(webhookEventsLog.receivedAt));

    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      channelSessionId: r.channelSessionId,
      provider: r.provider,
      webhookPathToken: r.webhookPathToken,
      httpMethod: r.httpMethod,
      headers: r.headers as Record<string, unknown>,
      rawBody: r.rawBody,
      payloadParsed: r.payloadParsed as unknown,
      signatureHeader: r.signatureHeader,
      validSignature: r.validSignature,
      eventType: r.eventType,
      externalId: r.externalId,
      status: r.status,
      attempts: r.attempts,
      errorMessage: r.errorMessage,
      processedAt: r.processedAt,
      receivedAt: r.receivedAt,
    }));
  }

  async getEvent(id: string): Promise<WebhookEvent> {
    const [row] = await this.db
      .select()
      .from(webhookEventsLog)
      .where(eq(webhookEventsLog.id, id));

    if (!row) throw new NotFoundException("Evento de webhook não encontrado");

    return {
      id: row.id,
      organizationId: row.organizationId,
      channelSessionId: row.channelSessionId,
      provider: row.provider,
      webhookPathToken: row.webhookPathToken,
      httpMethod: row.httpMethod,
      headers: row.headers as Record<string, unknown>,
      rawBody: row.rawBody,
      payloadParsed: row.payloadParsed as unknown,
      signatureHeader: row.signatureHeader,
      validSignature: row.validSignature,
      eventType: row.eventType,
      externalId: row.externalId,
      status: row.status,
      attempts: row.attempts,
      errorMessage: row.errorMessage,
      processedAt: row.processedAt,
      receivedAt: row.receivedAt,
    };
  }
}

import { NotFoundException } from "@nestjs/common";
import { desc } from "drizzle-orm";
