import { eq, and, ilike, desc, asc, sql, count } from "drizzle-orm";
import { DbClient } from "./client";
import {
  crmLeads,
  crmPipelines,
  crmStages,
  contacts,
  type NewLead,
  type Lead,
} from "./schema";

export type NewLeadInput = Omit<NewLead, "id" | "createdAt" | "updatedAt">;

export class LeadRepository {
  constructor(private db: DbClient) {}

  async create(data: NewLeadInput): Promise<Lead> {
    const [lead] = await this.db.insert(crmLeads).values(data).returning();
    return lead;
  }

  async findById(id: string, organizationId: string): Promise<Lead | null> {
    const [lead] = await this.db
      .select()
      .from(crmLeads)
      .where(
        and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId))
      );
    return lead ?? null;
  }

  async findByOrganization(
    organizationId: string,
    {
      page = 1,
      limit = 20,
      status,
      pipelineId,
      stageId,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    }: {
      page?: number;
      limit?: number;
      status?: string;
      pipelineId?: string;
      stageId?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ) {
    const offset = (page - 1) * limit;

    const conditions = [eq(crmLeads.organizationId, organizationId)];

    if (status) conditions.push(eq(crmLeads.status, status));
    if (pipelineId) conditions.push(eq(crmLeads.pipelineId, pipelineId));
    if (stageId) conditions.push(eq(crmLeads.stageId, stageId));
    if (search) {
      conditions.push(ilike(crmLeads.title, `%${search}%`));
    }

    const orderFn = sortOrder === "asc" ? asc : desc;
    const orderColumn =
      crmLeads[sortBy as keyof typeof crmLeads] ?? crmLeads.createdAt;

    const [results, totalResult] = await Promise.all([
      this.db
        .select()
        .from(crmLeads)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(crmLeads)
        .where(and(...conditions)),
    ]);

    return {
      data: results,
      total: totalResult[0]?.count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((totalResult[0]?.count ?? 0) / limit),
    };
  }

  async update(
    id: string,
    organizationId: string,
    data: Partial<Omit<Lead, "id" | "createdAt">>
  ): Promise<Lead | null> {
    const [lead] = await this.db
      .update(crmLeads)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId))
      )
      .returning();
    return lead ?? null;
  }

  async findByExternalId(
    externalId: string,
    organizationId: string
  ): Promise<Lead | null> {
    const [lead] = await this.db
      .select()
      .from(crmLeads)
      .where(
        and(
          eq(crmLeads.externalId, externalId),
          eq(crmLeads.organizationId, organizationId)
        )
      );
    return lead ?? null;
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const [result] = await this.db
      .delete(crmLeads)
      .where(
        and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId))
      )
      .returning({ id: crmLeads.id });
    return !!result;
  }

  async findWithPipelineAndStage(
    id: string,
    organizationId: string
  ): Promise<{
    lead: Lead;
    pipeline: { id: string; name: string; slug: string };
    stage: { id: string; name: string; slug: string; color: string | null };
  } | null> {
    const [result] = await this.db
      .select({
        lead: crmLeads,
        pipeline: {
          id: crmPipelines.id,
          name: crmPipelines.name,
          slug: crmPipelines.slug,
        },
        stage: {
          id: crmStages.id,
          name: crmStages.name,
          slug: crmStages.slug,
          color: crmStages.color,
        },
      })
      .from(crmLeads)
      .leftJoin(crmPipelines, eq(crmLeads.pipelineId, crmPipelines.id))
      .leftJoin(crmStages, eq(crmLeads.stageId, crmStages.id))
      .where(
        and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId))
      );

    if (!result) return null;
    return {
      lead: result.lead,
      pipeline: result.pipeline!,
      stage: result.stage!,
    };
  }
}
