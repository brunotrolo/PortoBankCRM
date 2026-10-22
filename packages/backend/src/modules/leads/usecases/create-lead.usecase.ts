import { Injectable, ConflictException } from "@nestjs/common";
import { LeadRepository } from "../../infrastructure/database/repositories/lead.repository";
import { crypto } from "../../shared/utils/crypto";

export interface CreateLeadDto {
  organizationId: string;
  pipelineId: string;
  stageId: string;
  title: string;
  contactId?: string;
  valueCents?: number;
  currency?: string;
  externalId?: string;
  source?: string;
  tags?: string[];
}

export interface LeadResponse {
  id: string;
  organizationId: string;
  pipelineId: string;
  stageId: string;
  title: string;
  status: "open" | "won" | "lost";
  contactId?: string;
  valueCents?: number;
  currency?: string;
  externalId?: string;
  source?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CreateLeadUseCase {
  constructor(private readonly leadRepository: LeadRepository) {}

  async execute(dto: CreateLeadDto): Promise<LeadResponse> {
    // Verifica se já existe lead com mesmo externalId na organização
    if (dto.externalId) {
      const existing = await this.leadRepository.findByExternalId(
        dto.externalId,
        dto.organizationId
      );
      if (existing) {
        throw new ConflictException(
          "Lead já existe com este externalId para esta organização"
        );
      }
    }

    const lead = await this.leadRepository.create({
      organizationId: dto.organizationId,
      pipelineId: dto.pipelineId,
      stageId: dto.stageId,
      title: dto.title,
      contactId: dto.contactId ?? null,
      valueCents: dto.valueCents ?? null,
      currency: dto.currency ?? "BRL",
      externalId: dto.externalId ?? null,
      source: dto.source ?? "manual",
      tags: dto.tags ?? [],
    });

    return this.mapToResponse(lead);
  }

  private mapToResponse(lead: any): LeadResponse {
    return {
      id: lead.id,
      organizationId: lead.organizationId,
      pipelineId: lead.pipelineId,
      stageId: lead.stageId,
      title: lead.title,
      status: lead.status,
      contactId: lead.contactId,
      valueCents: lead.valueCents,
      currency: lead.currency,
      externalId: lead.externalId,
      source: lead.source,
      tags: lead.tags ?? [],
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    };
  }
}
