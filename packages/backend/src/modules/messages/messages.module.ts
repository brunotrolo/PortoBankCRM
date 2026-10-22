import { Module } from "@nestjs/common";
import { MessagesController } from "./messages.controller";
import { MessagesService } from "./messages.service";
import { SqsService } from "./sqs.service";

@Module({
  controllers: [MessagesController],
  providers: [MessagesService, SqsService],
  exports: [MessagesService, SqsService],
})
export class MessagesModule {}
