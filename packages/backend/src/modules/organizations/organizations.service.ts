import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { DbClient } from "../../infrastructure/database/client";
import { organizations } from "../../infrastructure/database/schema";
import { eq, and } from "drizzle-orm";

export interface CreateOrgDto {
  slug: string;
  legalName: string;
  displayName: string;
  cnpj?: string;
  timezone?: string;
  locale?: string;
}

export interface Organization {
  id: string;
  slug: string;
  legalName: string;
  displayName: string;
  cnpj?: string;
  timezone: string;
  locale: string;
  status: string;
  rateLimitRps: number;
  aiBudgetCents: number | null;
  mediaRetentionDays: number;
  settings: Record<string, unknown>;
  dpoEmail?: string;
  privacyPolicyUrl?: string;
  onboardedAt?: Date;
  suspendedAt?: Date;
  redactedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly db: DbClient) {}

  async list(): Promise<Organization[]> {
    return this.db.select().from(organizations);
  }

  async getById(id: string): Promise<Organization> {
    const [org] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    if (!org) throw new NotFoundException("Organização não encontrada");
    return org;
  }

  async getBySlug(slug: string): Promise<Organization | null> {
    const [org] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug));
    return org ?? null;
  }

  async create(dto: CreateOrgDto): Promise<Organization> {
    const existing = await this.getBySlug(dto.slug);
    if (existing) {
      throw new ConflictException("Slug já existe");
    }

    const [org] = await this.db
      .insert(organizations)
      .values({
        slug: dto.slug,
        legalName: dto.legalName,
        displayName: dto.displayName,
        cnpj: dto.cnpj ?? null,
        timezone: dto.timezone ?? "America/Sao_Paulo",
        locale: dto.locale ?? "pt-BR",
      })
      .returning();
    return org;
  }

  async isOperante(organizationId: string): Promise<boolean> {
    const org = await this.getById(organizationId);
    return org.status === "active";
  }
}
