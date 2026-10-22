import { Controller, Post, Body, Param, UseGuards } from "@nestjs/common";
import { WebhooksService } from "./webhooks.service";
import { CedarAuthGuard } from "../../shared/guards/cedar.auth.guard";

@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Post("in/:token")
  async inbound(@Param("token") token: string, @Body() body: unknown) {
    return this.service.processInbound(token, body);
  }

  @Post(":source")
  @UseGuards(CedarAuthGuard)
  async outbound(@Param("source") source: string, @Body() body: unknown) {
    return this.service.sendOutbound(source, body);
  }
}
