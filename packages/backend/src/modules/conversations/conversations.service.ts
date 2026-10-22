import { Injectable, NotFoundException } from "@nestjs/common";
import { DbClient } from "../../infrastructure/database/client";
import {
  conversations,
  messages,
  channelSessions,
  contacts,
} from "../../infrastructure/database/schema";
import { eq, and, desc } from "drizzle-orm";

export interface CreateConversationDto {
  organizationId: string;
  contactId: string;
  channelSessionId: string;
  channel?: string;
  status?: string;
  assignedToUserId?: string;
}

export interface Conversation {
  id: string;
  organizationId: string;
  contactId: string;
  channelSessionId: string;
  channel: string;
  status: string;
  statusChangedAt: Date;
  assignedToUserId?: string;
  assignedAt?: Date;
  lastInboundAt?: Date;
  lastOutboundAt?: Date;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  unreadCountForAssignee: number;
  isGroup: boolean;
  groupChatId?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  botSilencedUntil?: Date;
  lastHandoffAt?: Date;
  lastHandoffReason?: string;
  contact?: {
    id: string;
    name?: string;
    displayName?: string;
    phoneNumber?: string;
    email?: string;
  };
  messagesCount?: number;
}

@Injectable()
export class ConversationsService {
  constructor(private readonly db: DbClient) {}

  async list(organizationId: string): Promise<Conversation[]> {
    const rows = await this.db
      .select({
        id: conversations.id,
        organizationId: conversations.organizationId,
        contactId: conversations.contactId,
        channelSessionId: conversations.channelSessionId,
        channel: conversations.channel,
        status: conversations.status,
        statusChangedAt: conversations.statusChangedAt,
        assignedToUserId: conversations.assignedToUserId,
        assignedAt: conversations.assignedAt,
        lastInboundAt: conversations.lastInboundAt,
        lastOutboundAt: conversations.lastOutboundAt,
        lastMessageAt: conversations.lastMessageAt,
        lastMessagePreview: conversations.lastMessagePreview,
        unreadCountForAssignee: conversations.unreadCountForAssignee,
        isGroup: conversations.isGroup,
        groupChatId: conversations.groupChatId,
        metadata: conversations.metadata,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        botSilencedUntil: conversations.botSilencedUntil,
        lastHandoffAt: conversations.lastHandoffAt,
        lastHandoffReason: conversations.lastHandoffReason,
        contactId: contacts.id,
        contactName: contacts.name,
        contactDisplayName: contacts.displayName,
        contactPhoneNumber: contacts.phoneNumber,
        contactEmail: contacts.email,
      })
      .from(conversations)
      .leftJoin(contacts, eq(conversations.contactId, contacts.id))
      .where(eq(conversations.organizationId, organizationId))
      .orderBy(desc(conversations.lastMessageAt ?? conversations.createdAt));

    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      contactId: r.contactId,
      channelSessionId: r.channelSessionId,
      channel: r.channel,
      status: r.status,
      statusChangedAt: r.statusChangedAt,
      assignedToUserId: r.assignedToUserId,
      assignedAt: r.assignedAt,
      lastInboundAt: r.lastInboundAt,
      lastOutboundAt: r.lastOutboundAt,
      lastMessageAt: r.lastMessageAt,
      lastMessagePreview: r.lastMessagePreview,
      unreadCountForAssignee: r.unreadCountForAssignee,
      isGroup: r.isGroup,
      groupChatId: r.groupChatId,
      metadata: r.metadata as Record<string, unknown>,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      botSilencedUntil: r.botSilencedUntil,
      lastHandoffAt: r.lastHandoffAt,
      lastHandoffReason: r.lastHandoffReason,
      contact: r.contactId
        ? {
            id: r.contactId,
            name: r.contactName,
            displayName: r.contactDisplayName,
            phoneNumber: r.contactPhoneNumber,
            email: r.contactEmail,
          }
        : undefined,
    }));
  }

  async getById(id: string, organizationId: string): Promise<Conversation> {
    const [row] = await this.db
      .select({
        id: conversations.id,
        organizationId: conversations.organizationId,
        contactId: conversations.contactId,
        channelSessionId: conversations.channelSessionId,
        channel: conversations.channel,
        status: conversations.status,
        statusChangedAt: conversations.statusChangedAt,
        assignedToUserId: conversations.assignedToUserId,
        assignedAt: conversations.assignedAt,
        lastInboundAt: conversations.lastInboundAt,
        lastOutboundAt: conversations.lastOutboundAt,
        lastMessageAt: conversations.lastMessageAt,
        lastMessagePreview: conversations.lastMessagePreview,
        unreadCountForAssignee: conversations.unreadCountForAssignee,
        isGroup: conversations.isGroup,
        groupChatId: conversations.groupChatId,
        metadata: conversations.metadata,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        botSilencedUntil: conversations.botSilencedUntil,
        lastHandoffAt: conversations.lastHandoffAt,
        lastHandoffReason: conversations.lastHandoffReason,
        contactId: contacts.id,
        contactName: contacts.name,
        contactDisplayName: contacts.displayName,
        contactPhoneNumber: contacts.phoneNumber,
        contactEmail: contacts.email,
      })
      .from(conversations)
      .leftJoin(contacts, eq(conversations.contactId, contacts.id))
      .where(
        and(eq(conversations.id, id), eq(conversations.organizationId, organizationId))
      );

    if (!row) throw new NotFoundException("Conversa não encontrada");

    return {
      id: row.id,
      organizationId: row.organizationId,
      contactId: row.contactId,
      channelSessionId: row.channelSessionId,
      channel: row.channel,
      status: row.status,
      statusChangedAt: row.statusChangedAt,
      assignedToUserId: row.assignedToUserId,
      assignedAt: row.assignedAt,
      lastInboundAt: row.lastInboundAt,
      lastOutboundAt: row.lastOutboundAt,
      lastMessageAt: row.lastMessageAt,
      lastMessagePreview: row.lastMessagePreview,
      unreadCountForAssignee: row.unreadCountForAssignee,
      isGroup: row.isGroup,
      groupChatId: row.groupChatId,
      metadata: row.metadata as Record<string, unknown>,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      botSilencedUntil: row.botSilencedUntil,
      lastHandoffAt: row.lastHandoffAt,
      lastHandoffReason: row.lastHandoffReason,
      contact: row.contactId
        ? {
            id: row.contactId,
            name: row.contactName,
            displayName: row.contactDisplayName,
            phoneNumber: row.contactPhoneNumber,
            email: row.contactEmail,
          }
        : undefined,
    };
  }

  async create(dto: CreateConversationDto): Promise<Conversation> {
    const [conv] = await this.db
      .insert(conversations)
      .values({
        organizationId: dto.organizationId,
        contactId: dto.contactId,
        channelSessionId: dto.channelSessionId,
        channel: dto.channel ?? "whatsapp",
        status: dto.status ?? "open",
        assignedToUserId: dto.assignedToUserId ?? null,
        unreadCountForAssignee: 0,
        isGroup: false,
        metadata: {},
      })
      .returning();

    return this.getById(conv.id, dto.organizationId);
  }

  async assignConversation(
    id: string,
    organizationId: string,
    userId: string
  ): Promise<Conversation> {
    const [conv] = await this.db
      .update(conversations)
      .set({
        assignedToUserId: userId,
        assignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(conversations.id, id), eq(conversations.organizationId, organizationId))
      )
      .returning();
    if (!conv) throw new NotFoundException("Conversa não encontrada");
    return this.getById(id, organizationId);
  }

  async unassignConversation(
    id: string,
    organizationId: string
  ): Promise<Conversation> {
    const [conv] = await this.db
      .update(conversations)
      .set({
        assignedToUserId: null,
        assignedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(conversations.id, id), eq(conversations.organizationId, organizationId))
      )
      .returning();
    if (!conv) throw new NotFoundException("Conversa não encontrada");
    return this.getById(id, organizationId);
  }

  async silenceBot(
    id: string,
    organizationId: string,
    until: Date,
    reason?: string
  ): Promise<Conversation> {
    const [conv] = await this.db
      .update(conversations)
      .set({
        botSilencedUntil: until,
        lastHandoffAt: new Date(),
        lastHandoffReason: reason ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(conversations.id, id), eq(conversations.organizationId, organizationId))
      )
      .returning();
    if (!conv) throw new NotFoundException("Conversa não encontrada");
    return this.getById(id, organizationId);
  }
}
