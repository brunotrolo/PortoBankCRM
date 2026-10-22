/**
 * DTOs de Leads (validação Zod/class-validator .strict())
 * [Traces: NFR-zod, ENT-lead]
 */

import { IsUUID, IsString, IsOptional, IsNumber, IsEnum, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { z } from 'zod';

export class CreateLeadDto {
  @IsUUID()
  pipelineId: string;

  @IsUUID()
  stageId: string;

  @IsString()
  title: string;

  @IsUUID()
  @IsOptional()
  contactId?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  valueCents?: number;

  @IsOptional()
  currency?: 'BRL' | 'USD' | 'EUR';
}

// Schema Zod para validação de input externo (guardrail anti-injeção)
export const CreateLeadSchema = z.object({
  pipelineId: z.string().uuid(),
  stageId: z.string().uuid(),
  title: z.string().min(1).max(200),
  contactId: z.string().uuid().optional(),
  valueCents: z.number().int().positive().optional(),
  currency: z.enum(['BRL', 'USD', 'EUR']).optional(),
});

export class LeadDto {
  id: string;
  organizationId: string;
  pipelineId: string;
  stageId: string;
  title: string;
  status: 'open' | 'won' | 'lost';
  contactId?: string;
  valueCents?: number;
  currency?: string;
}
