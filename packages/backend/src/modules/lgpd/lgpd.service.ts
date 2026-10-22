import { Injectable, NotFoundException } from "@nestjs/common";
import { DbClient } from "../../infrastructure/database/client";
import {
  lgpdRequests,
  storageRedactionQueue,
} from "../../infrastructure/database/schema";
import { eq } from "drizzle-orm";

export interface CreateLgpdRequestDto {
  organizationId: string;
  requestType: "data_request" | "redact" | "store_redact";
  source: "manual" | "api" | "nuvemshop" | "support";
  contactId?: string;
  externalCustomerId?: string;
  scope?: "contact" | "tenant";
  emergency?: boolean;
}

export interface LgpdRequest {
  id: string;
  organizationId: string;
  requestType: string;
  source: string;
  contactId?: string;
  externalCustomerId?: string;
  status: string;
  attempts: number;
  receivedAt: Date;
  dueAt: Date;
  completedAt?: Date;
  requestPayload: Record<string, unknown>;
  result?: Record<string, unknown>;
  errorMessage?: string;
  cascadedTo?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  emergency: boolean;
  scope: string;
}

@Injectable()
export class LgpdService {
  constructor(private readonly db: DbClient) {}

  async createRequest(dto: CreateLgpdRequestDto): Promise<LgpdRequest> {
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 15); // SLA de 15 dias (Artigo 18 LGPD)

    const [req] = await this.db
      .insert(lgpdRequests)
      .values({
        organizationId: dto.organizationId,
        requestType: dto.requestType,
        source: dto.source,
        contactId: dto.contactId ?? null,
        externalCustomerId: dto.externalCustomerId ?? null,
        status: "received",
        attempts: 0,
        dueAt,
        requestPayload: {},
        emergency: dto.emergency ?? false,
        scope: dto.scope ?? "contact",
      })
      .returning();

    return this.mapToDto(req);
  }

  async listRequests(organizationId?: string): Promise<LgpdRequest[]> {
    let query = this.db.select().from(lgpdRequests);

    if (organizationId) {
      query = query.where(eq(lgpdRequests.organizationId, organizationId));
    }

    const rows = await query.orderBy(desc(lgpdRequests.createdAt));
    return rows.map((r) => this.mapToDto(r));
  }

  async getRequest(id: string): Promise<LgpdRequest> {
    const [row] = await this.db
      .select()
      .from(lgpdRequests)
      .where(eq(lgpdRequests.id, id));

    if (!row) throw new NotFoundException("Solicitação LGPD não encontrada");

    return this.mapToDto(row);
  }

  async redactContact(contactId: string): Promise<{ contactId: string; redacted: boolean }> {
    // Marcar contato como anonimizado (LGPD - irreversível)
    const { contacts } = await import("../../infrastructure/database/schema");
    const [contact] = await this.db
      .update(contacts)
      .set({
        isAnonymized: true,
        anonymizedAt: new Date(),
        name: null,
        displayName: null,
        email: null,
        phoneNumber: null,
        cpfEncrypted: null,
        cpfHash: null,
      })
      .where(eq(contacts.id, contactId))
      .returning({ id: contacts.id });

    if (!contact) throw new NotFoundException("Contato não encontrado");

    // Enfileirar redação de objetos de storage
    await this.db.insert(storageRedactionQueue).values({
      organizationId: null, // Será preenchido pelo worker
      requestId: null,
      bucket: "whatsapp-media",
      objectPath: `contacts/${contactId}/*`,
      status: "pending",
    });

    return { contactId, redacted: true };
  }

  private mapToDto(row: any): LgpdRequest {
    return {
      id: row.id,
      organizationId: row.organizationId,
      requestType: row.requestType,
      source: row.source,
      contactId: row.contactId,
      externalCustomerId: row.externalCustomerId,
      status: row.status,
      attempts: row.attempts,
      receivedAt: row.receivedAt,
      dueAt: row.dueAt,
      completedAt: row.completedAt,
      requestPayload: row.requestPayload as Record<string, unknown>,
      result: row.result as Record<string, unknown>,
      errorMessage: row.errorMessage,
      cascadedTo: row.cascadedTo as Record<string, unknown>,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      emergency: row.emergency,
      scope: row.scope,
    };
  }
}
