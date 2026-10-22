import { Injectable, NotFoundException } from "@nestjs/common";
import { DbClient } from "../../infrastructure/database/client";
import {
  messages,
  conversations,
  contacts,
  channelSessions,
} from "../../infrastructure/database/schema";
import { eq, and, desc, ilike } from "drizzle-orm";
import { SqsService } from "./sqs.service";

export interface SendMessageDto {
  organizationId: string;
  conversationId: string;
  contactId: string;
  channelSessionId: string;
  type: string;
  direction: string;
  body?: string;
  mediaUrl?: string;
  externalId?: string;
}

export interface Message {
  id: string;
  organizationId: string;
  conversationId: string;
  channelSessionId: string;
  contactId: string;
  externalId?: string;
  type: string;
  direction: string;
  status: string;
  ack?: number;
  errorCode?: string;
  errorMessage?: string;
  body?: string;
  mediaUrl?: string;
  mediaMime?: string;
  mediaSizeBytes?: number;
  mediaStoragePath?: string;
  sentVia: string;
  sentByUserId?: string;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  metadata: Record<string, unknown>;
  activityId?: string;
  createdAt: Date;
  updatedAt: Date;
  contact?: {
    id: string;
    name?: string;
    displayName?: string;
    phoneNumber?: string;
  };
}

@Injectable()
export class MessagesService {
  constructor(
    private readonly db: DbClient,
    private readonly sqsService: SqsService
  ) {}

  async list(conversationId: string, organizationId: string): Promise<Message[]> {
    const rows = await this.db
      .select({
        id: messages.id,
        organizationId: messages.organizationId,
        conversationId: messages.conversationId,
        channelSessionId: messages.channelSessionId,
        contactId: messages.contactId,
        externalId: messages.externalId,
        type: messages.type,
        direction: messages.direction,
        status: messages.status,
        ack: messages.ack,
        errorCode: messages.errorCode,
        errorMessage: messages.errorMessage,
        body: messages.body,
        mediaUrl: messages.mediaUrl,
        mediaMime: messages.mediaMime,
        mediaSizeBytes: messages.mediaSizeBytes,
        mediaStoragePath: messages.mediaStoragePath,
        sentVia: messages.sentVia,
        sentByUserId: messages.sentByUserId,
        sentAt: messages.sentAt,
        deliveredAt: messages.deliveredAt,
        readAt: messages.readAt,
        metadata: messages.metadata,
        activityId: messages.activityId,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        contactId: contacts.id,
        contactName: contacts.name,
        contactDisplayName: contacts.displayName,
        contactPhoneNumber: contacts.phoneNumber,
      })
      .from(messages)
      .leftJoin(contacts, eq(messages.contactId, contacts.id))
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.organizationId, organizationId)
        )
      )
      .orderBy(desc(messages.createdAt));

    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      conversationId: r.conversationId,
      channelSessionId: r.channelSessionId,
      contactId: r.contactId,
      externalId: r.externalId,
      type: r.type,
      direction: r.direction,
      status: r.status,
      ack: r.ack,
      errorCode: r.errorCode,
      errorMessage: r.errorMessage,
      body: r.body,
      mediaUrl: r.mediaUrl,
      mediaMime: r.mediaMime,
      mediaSizeBytes: r.mediaSizeBytes,
      mediaStoragePath: r.mediaStoragePath,
      sentVia: r.sentVia,
      sentByUserId: r.sentByUserId,
      sentAt: r.sentAt,
      deliveredAt: r.deliveredAt,
      readAt: r.readAt,
      metadata: r.metadata as Record<string, unknown>,
      activityId: r.activityId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      contact: r.contactId
        ? {
            id: r.contactId,
            name: r.contactName,
            displayName: r.contactDisplayName,
            phoneNumber: r.contactPhoneNumber,
          }
        : undefined,
    }));
  }

  async send(dto: SendMessageDto): Promise<Message> {
    // Validar que a conversa pertence à organização
    const [conv] = await this.db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, dto.conversationId),
          eq(conversations.organizationId, dto.organizationId)
        )
      );

    if (!conv) throw new NotFoundException("Conversa não encontrada");

    // Salvar mensagem no banco
    const [msg] = await this.db
      .insert(messages)
      .values({
        organizationId: dto.organizationId,
        conversationId: dto.conversationId,
        channelSessionId: dto.channelSessionId,
        contactId: dto.contactId,
        externalId: dto.externalId ?? null,
        type: dto.type,
        direction: dto.direction,
        status: dto.direction === "outbound" ? "queued" : "received",
        body: dto.body ?? null,
        mediaUrl: dto.mediaUrl ?? null,
        sentVia: "crm",
        metadata: {},
      })
      .returning();

    // Enfileirar no SQS para processamento assíncrono (envio via WAHA)
    await this.sqsService.sendMessage(
      "porto-bank-crm-event-log-drain",
      JSON.stringify({
        eventType: "message.send",
        entityKind: "message",
        entityId: msg.id,
        payload: {
          messageId: msg.id,
          conversationId: dto.conversationId,
          contactId: dto.contactId,
          channelSessionId: dto.channelSessionId,
          body: dto.body,
          direction: dto.direction,
        },
        metadata: {
          source: "api",
          service: "porto-bank-crm-api",
        },
      }),
      {
        eventType: { DataType: "String", StringValue: "message.send" },
        entityKind: { DataType: "String", StringValue: "message" },
      }
    );

    return this.getById(msg.id, dto.organizationId);
  }

  async getById(id: string, organizationId: string): Promise<Message> {
    const [row] = await this.db
      .select({
        id: messages.id,
        organizationId: messages.organizationId,
        conversationId: messages.conversationId,
        channelSessionId: messages.channelSessionId,
        contactId: messages.contactId,
        externalId: messages.externalId,
        type: messages.type,
        direction: messages.direction,
        status: messages.status,
        ack: messages.ack,
        errorCode: messages.errorCode,
        errorMessage: messages.errorMessage,
        body: messages.body,
        mediaUrl: messages.mediaUrl,
        mediaMime: messages.mediaMime,
        mediaSizeBytes: messages.mediaSizeBytes,
        mediaStoragePath: messages.mediaStoragePath,
        sentVia: messages.sentVia,
        sentByUserId: messages.sentByUserId,
        sentAt: messages.sentAt,
        deliveredAt: messages.deliveredAt,
        readAt: messages.readAt,
        metadata: messages.metadata,
        activityId: messages.activityId,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        contactId: contacts.id,
        contactName: contacts.name,
        contactDisplayName: contacts.displayName,
        contactPhoneNumber: contacts.phoneNumber,
      })
      .from(messages)
      .leftJoin(contacts, eq(messages.contactId, contacts.id))
      .where(
        and(eq(messages.id, id), eq(messages.organizationId, organizationId))
      );

    if (!row) throw new NotFoundException("Mensagem não encontrada");

    return {
      id: row.id,
      organizationId: row.organizationId,
      conversationId: row.conversationId,
      channelSessionId: row.channelSessionId,
      contactId: row.contactId,
      externalId: row.externalId,
      type: row.type,
      direction: row.direction,
      status: row.status,
      ack: row.ack,
      errorCode: row.errorCode,
      errorMessage: row.errorMessage,
      body: row.body,
      mediaUrl: row.mediaUrl,
      mediaMime: row.mediaMime,
      mediaSizeBytes: row.mediaSizeBytes,
      mediaStoragePath: row.mediaStoragePath,
      sentVia: row.sentVia,
      sentByUserId: row.sentByUserId,
      sentAt: row.sentAt,
      deliveredAt: row.deliveredAt,
      readAt: row.readAt,
      metadata: row.metadata as Record<string, unknown>,
      activityId: row.activityId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      contact: row.contactId
        ? {
            id: row.contactId,
            name: row.contactName,
            displayName: row.contactDisplayName,
            phoneNumber: row.contactPhoneNumber,
          }
        : undefined,
    };
  }

  async markAsRead(
    id: string,
    organizationId: string
  ): Promise<Message> {
    const [msg] = await this.db
      .update(messages)
      .set({
        status: "read",
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(messages.id, id), eq(messages.organizationId, organizationId))
      )
      .returning();
    if (!msg) throw new NotFoundException("Mensagem não encontrada");
    return this.getById(id, organizationId);
  }
}
