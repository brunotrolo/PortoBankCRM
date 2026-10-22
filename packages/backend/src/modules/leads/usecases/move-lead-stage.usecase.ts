/**
 * Use Case — Mover lead de estágio (máquina de estados)
 * [Traces: UC-001, BR-07, BR-08, BR-09, BR-10]
 */

import { Injectable } from '@nestjs/common';
import { LeadRepository } from '../domain/lead.repository.port';
import { DomainException } from '../../../shared/exceptions/domain.exceptions';

@Injectable()
export class MoveLeadStageUseCase {
  constructor(private readonly leadRepository: LeadRepository) {}

  async execute(leadId: string, organizationId: string, newStageId: string, actorId: string): Promise<void> {
    const lead = await this.leadRepository.findById(leadId, organizationId);
    if (!lead) {
      throw new DomainException('lead_not_found', 'Lead não encontrado', 404);
    }
    lead.transitionTo(newStageId, actorId);
    await this.leadRepository.save(lead);
    // Emitir evento lead.stage_changed no EventBridge
  }
}
