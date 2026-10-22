import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { AiAgentService } from "./ai-agent.service";
import { CedarAuthGuard } from "../../shared/guards/cedar.auth.guard";

@Controller("ai")
@UseGuards(CedarAuthGuard)
export class AiAgentController {
  constructor(private readonly aiAgentService: AiAgentService) {}

  @Post("respond")
  async respond(@Body() body: { prompt: string; organizationId: string }) {
    return this.aiAgentService.generateResponse(body.prompt, body.organizationId);
  }

  @Post("sentiment")
  async sentiment(@Body() body: { text: string }) {
    return this.aiAgentService.analyzeSentiment(body.text);
  }
}
