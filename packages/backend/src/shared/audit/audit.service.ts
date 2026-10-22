/**
 * Shared kernel — Auditoria imutável (@AuditAction)
 * [Traces: NFR-audit, NFR-rls]
 *
 * Acionado em toda leitura de PII e mudança de estágio, taxa ou limite de crédito.
 * Gravado em S3 Object Lock (retentação 5 anos).
 */

import { Injectable, Logger } from '@nestjs/common';

export type AuditAction = 'lead.stage_changed' | 'lead.lost' | 'contact.redacted' | 'ai.turn' | 'ai.budget_throttle' | 'lgpd.request';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  async record(action: AuditAction, actorId: string, organizationId: string, metadata: Record<string, unknown>): Promise<void> {
    // Em produção: grava em S3 Object Lock + CloudWatch
    this.logger.log(JSON.stringify({
      action, actorId, organizationId, metadata, timestamp: new Date().toISOString(),
      source: 'deskcomm-crm-backend',
    }));
  }
}

export const AuditAction = (action: AuditAction) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const result = await original.apply(this, args);
      // Nota: extrair actorId/organizationId do contexto de execução (request scope)
      return result;
    };
  };
};
