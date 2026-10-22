import { Module } from "@nestjs/common";
import { LeadsController } from "./leads.controller";
import { CreateLeadUseCase } from "./usecases/create-lead.usecase";
import { LeadRepository } from "../../infrastructure/database/repositories/lead.repository";
import { DbClient } from "../../infrastructure/database/client";

@Module({
  controllers: [LeadsController],
  providers: [
    {
      provide: LeadRepository,
      useFactory: (dbClient: DbClient) => new LeadRepository(dbClient),
      inject: [DbClient],
    },
    CreateLeadUseCase,
  ],
})
export class LeadsModule {}
