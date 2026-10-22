import { Injectable, NotFoundException } from "@nestjs/common";
import { DbClient } from "../../infrastructure/database/client";
import { automationRules } from "../../infrastructure/database/schema";
import { eq, and } from "drizzle-orm";

export interface CreateAutomationRuleDto {
  organizationId: string;
  name: string;
  description?: string;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  triggerType: string;
  triggerConfig?: Record<string, unknown>;
}

export interface AutomationRule {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  triggerType: string;
  triggerConfig?: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AutomationService {
  constructor(private readonly db: DbClient) {}

  async createRule(dto: CreateAutomationRuleDto): Promise<AutomationRule> {
    const [rule] = await this.db
      .insert(automationRules)
      .values({
        organizationId: dto.organizationId,
        name: dto.name,
        description: dto.description ?? null,
        conditions: dto.conditions,
        actions: dto.actions,
        triggerType: dto.triggerType,
        triggerConfig: dto.triggerConfig ?? null,
        isActive: false,
      })
      .returning();
    return rule;
  }

  async listRules(organizationId?: string): Promise<AutomationRule[]> {
    if (organizationId) {
      return this.db
        .select()
        .from(automationRules)
        .where(eq(automationRules.organizationId, organizationId));
    }
    return this.db.select().from(automationRules);
  }

  async getRule(id: string): Promise<AutomationRule> {
    const [rule] = await this.db
      .select()
      .from(automationRules)
      .where(eq(automationRules.id, id));
    if (!rule) throw new NotFoundException("Regra de automação não encontrada");
    return rule;
  }

  async updateRule(
    id: string,
    organizationId: string,
    dto: Partial<CreateAutomationRuleDto>
  ): Promise<AutomationRule> {
    const [rule] = await this.db
      .update(automationRules)
      .set({
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.conditions && { conditions: dto.conditions }),
        ...(dto.actions && { actions: dto.actions }),
        ...(dto.triggerType && { triggerType: dto.triggerType }),
        ...(dto.triggerConfig !== undefined && {
          triggerConfig: dto.triggerConfig,
        }),
        updatedAt: new Date(),
      })
      .where(
        and(eq(automationRules.id, id), eq(automationRules.organizationId, organizationId))
      )
      .returning();
    if (!rule) throw new NotFoundException("Regra de automação não encontrada");
    return rule;
  }

  async deleteRule(id: string, organizationId: string): Promise<void> {
    const [rule] = await this.db
      .delete(automationRules)
      .where(
        and(eq(automationRules.id, id), eq(automationRules.organizationId, organizationId))
      )
      .returning({ id: automationRules.id });
    if (!rule) throw new NotFoundException("Regra de automação não encontrada");
  }

  async activateRule(id: string, organizationId: string): Promise<AutomationRule> {
    const [rule] = await this.db
      .update(automationRules)
      .set({ isActive: true, updatedAt: new Date() })
      .where(
        and(eq(automationRules.id, id), eq(automationRules.organizationId, organizationId))
      )
      .returning();
    if (!rule) throw new NotFoundException("Regra de automação não encontrada");
    return rule;
  }

  async deactivateRule(id: string, organizationId: string): Promise<AutomationRule> {
    const [rule] = await this.db
      .update(automationRules)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(eq(automationRules.id, id), eq(automationRules.organizationId, organizationId))
      )
      .returning();
    if (!rule) throw new NotFoundException("Regra de automação não encontrada");
    return rule;
  }

  async evaluateEvent(
    organizationId: string,
    eventType: string,
    entityKind: string,
    payload: Record<string, unknown>
  ): Promise<{ matched: number; actions: string[] }> {
    const rules = await this.listRules(organizationId);
    const activeRules = rules.filter((r) => r.isActive && r.triggerType === eventType);

    const executedActions: string[] = [];

    for (const rule of activeRules) {
      // Simples avaliação de condições: verifica se entityKind corresponde
      if (rule.triggerConfig?.entityKind && rule.triggerConfig.entityKind !== entityKind) {
        continue;
      }

      // Executar ações definidas na regra
      if (rule.actions) {
        const actionTypes = Array.isArray(rule.actions)
          ? rule.actions
          : rule.actions.actionTypes || [];
        for (const action of actionTypes) {
          executedActions.push(`${rule.name}:${action}`);
        }
      }
    }

    return { matched: activeRules.length, actions: executedActions };
  }
}
