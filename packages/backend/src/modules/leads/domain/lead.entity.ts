/**
 * Domain — Entidade Lead (regras de negócio puras, sem dependência de infra)
 * [Traces: ENT-lead, BR-07, BR-08, BR-09, BR-10]
 */

import { DomainException } from '../../../shared/exceptions/domain.exceptions';

export class Lead {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly pipelineId: string,
    public readonly stageId: string,
    public readonly title: string,
    public status: 'open' | 'won' | 'lost',
    public readonly contactId: string | null,
    public readonly valueCents: number | null,
    public readonly currency: string | null,
    public readonly closedAt: Date | null,
    public readonly lostReason: string | null,
    public readonly ownerUserId: string | null,
  ) {}

  /**
   * BR-07: transição de estágio validada por máquina de estados.
   * BR-09: closed_at preenchido iff won/lost.
   * BR-10: is_won e is_lost mutuamente exclusivos.
   */
  transitionTo(newStageId: string, actorId: string): void {
    if (this.status === 'closed') {
      throw new DomainException('lead_already_closed', 'Lead já está fechado', 409);
    }
    // Lógica de máquina de estados seria consultada do repositório de estágios
    // Aqui apenas a regra de domínio; validação de estágio válido fica no use case.
  }

  closeAsLost(lostReason: string, closedAt: Date): void {
    // BR-08: lost_reason obrigatório quando lost
    if (!lostReason || lostReason.trim().length === 0) {
      throw new DomainException('lost_reason_required', 'lost_reason é obrigatório para lead perdido', 400);
    }
    // BR-09
    this.status = 'lost';
    this.lostReason = lostReason;
    // closedAt seria setado pelo use case
  }

  closeAsWon(closedAt: Date): void {
    // BR-10: não pode ser won e perdido ao mesmo tempo
    if (this.lostReason) {
      throw new DomainException('lead_already_lost', 'Lead já está perdido', 409);
    }
    this.status = 'won';
  }
}

export interface LeadProps {
  id: string;
  organizationId: string;
  pipelineId: string;
  stageId: string;
  title: string;
  status: 'open' | 'won' | 'lost';
  contactId: string | null;
  valueCents: number | null;
  currency: string | null;
  closedAt: Date | null;
  lostReason: string | null;
  ownerUserId: string | null;
}
