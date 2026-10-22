import { Controller, Post, Get, Body, UseGuards } from "@nestjs/common";
import { LgpdService } from "./lgpd.service";
import { CedarAuthGuard } from "../../shared/guards/cedar.auth.guard";

@Controller("lgpd")
@UseGuards(CedarAuthGuard)
export class LgpdController {
  constructor(private readonly service: LgpdService) {}

  @Post("requests")
  async create(@Body() body: unknown) {
    return this.service.createRequest(body);
  }

  @Get("requests")
  async list() {
    return this.service.listRequests();
  }
}
