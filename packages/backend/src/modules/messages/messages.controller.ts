import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { MessagesService } from "./messages.service";
import { CedarAuthGuard } from "../../shared/guards/cedar.auth.guard";

@Controller("messages")
@UseGuards(CedarAuthGuard)
export class MessagesController {
  constructor(private readonly service: MessagesService) {}

  @Get()
  async list(@Body() body: { conversationId: string }) {
    return this.service.list(body.conversationId);
  }

  @Post()
  async send(@Body() body: unknown) {
    return this.service.send(body);
  }
}
