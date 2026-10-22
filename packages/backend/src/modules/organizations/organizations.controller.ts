import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { OrganizationsService } from "./organizations.service";
import { CedarAuthGuard } from "../../shared/guards/cedar.auth.guard";
import { z } from "zod";

const createOrgSchema = z.object({
  slug: z.string().min(3).max(100),
  legalName: z.string().min(1),
  displayName: z.string().min(1),
  cnpj: z.string().optional(),
  timezone: z.string().default("America/Sao_Paulo"),
  locale: z.string().default("pt-BR"),
});

@Controller("organizations")
@UseGuards(CedarAuthGuard)
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Get()
  async list() {
    return this.orgsService.list();
  }

  @Post()
  async create(@Body() body: unknown) {
    const dto = createOrgSchema.parse(body);
    return this.orgsService.create(dto);
  }
}
