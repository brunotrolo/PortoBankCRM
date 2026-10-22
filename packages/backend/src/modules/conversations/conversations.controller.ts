import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { ConversationsService } from "./conversations.service";
import { CedarAuthGuard } from "../../shared/guards/cedar.auth.guard";

@Controller("conversations")
@UseGuards(CedarAuthGuard)
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  @Get()
  async list(@Body() body: { organizationId: string }) {
    return this.service.list(body.organizationId);
  }

  @Post()
  async create(@Body() body: unknown) {
    return this.service.create(body);
  }
}
