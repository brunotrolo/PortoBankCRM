import { Controller, Post, Body, Get, UseGuards } from "@nestjs/common";
import { AutomationService } from "./automation.service";
import { CedarAuthGuard } from "../../shared/guards/cedar.auth.guard";

@Controller("automation-rules")
@UseGuards(CedarAuthGuard)
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Post()
  async create(@Body() body: unknown) {
    return this.automationService.createRule(body);
  }

  @Get()
  async list() {
    return this.automationService.listRules();
  }
}
