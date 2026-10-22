/**
 * Domain — Interface do repositório de Lead (porta)
 * [Traces: ENT-lead, NFR-rls]
 */

export interface LeadRepository {
  findById(id: string, organizationId: string): Promise<Lead | null>;
  findByOrganization(organizationId: string, filters?: { stageId?: string; status?: string }): Promise<Lead[]>;
  save(lead: Lead): Promise<void>;
}

import { Lead } from './lead.entity';
