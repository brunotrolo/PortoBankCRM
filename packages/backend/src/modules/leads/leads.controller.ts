import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Query as ReqQuery,
} from "@nestjs/common";
import { z } from "zod";
import { CreateLeadUseCase } from "./usecases/create-lead.usecase";
import { LeadRepository } from "../../infrastructure/database/repositories/lead.repository";
import { CedarAuthGuard } from "../../shared/guards/cedar.auth.guard";
import { IdempotencyService } from "../../shared/idempotency/idempotency.service";
import { DbClient } from "../../infrastructure/database/client";
import { createDbClient } from "../../infrastructure/database/client";

const createLeadSchema = z.object({
  organizationId: z.string().uuid(),
  pipelineId: z.string().uuid(),
  stageId: z.string().uuid(),
  title: z.string().min(1).max(200),
  contactId: z.string().uuid().optional(),
  valueCents: z.number().int().positive().optional(),
  currency: z.enum(["BRL", "USD", "EUR"]).default("BRL"),
  externalId: z.string().optional(),
  source: z.enum(["manual", "webhook", "api", "import"]).default("manual"),
  tags: z.array(z.string()).default([]),
});

const listLeadsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(["open", "won", "lost"]).optional(),
  pipelineId: z.string().uuid().optional(),
  stageId: z.string().uuid().optional(),
  search: z.string().optional(),
});

@Controller("leads")
@UseGuards(CedarAuthGuard)
export class LeadsController {
  private readonly createLeadUseCase: CreateLeadUseCase;
  private readonly leadRepository: LeadRepository;

  constructor(
    private readonly idempotency: IdempotencyService,
    private readonly dbClient: DbClient
  ) {
    this.leadRepository = new LeadRepository(dbClient);
    this.createLeadUseCase = new CreateLeadUseCase(this.leadRepository);
  }

  @Post()
  async create(@Body() body: unknown, @Query("idempotency-key") idempotencyKey?: string) {
    const parsed = createLeadSchema.parse(body);

    if (idempotencyKey) {
      const isDuplicate = await this.idempotency.isDuplicate(
        idempotencyKey,
        parsed.organizationId,
        "POST /api/v1/leads"
      );
      if (isDuplicate) {
        return { status: 409, error: "Requisição duplicada" };
      }
      await this.idempotency.checkAndRegister(
        idempotencyKey,
        parsed.organizationId,
        "POST /api/v1/leads",
        JSON.stringify(parsed)
      );
    }

    return this.createLeadUseCase.execute(parsed);
  }

  @Get()
  async list(@ReqQuery() query: unknown) {
    const parsed = listLeadsQuerySchema.parse(query);
    return this.leadRepository.findByOrganization(
      parsed.organizationId as string,
      {
        page: parsed.page,
        limit: parsed.limit,
        status: parsed.status,
        pipelineId: parsed.pipelineId,
        stageId: parsed.stageId,
        search: parsed.search,
      }
    );
  }

  @Get(":id")
  async getById(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    return this.leadRepository.findById(id, organizationId);
  }
}
