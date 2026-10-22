import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { SqsService } from "../modules/messages/sqs.service";
import { ConfigService } from "@nestjs/config";
import { startWorker } from "./event-consumer";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["log", "error", "warn", "debug"],
  });

  await app.init();

  const sqsService = app.get(SqsService);
  const configService = app.get(ConfigService);

  await startWorker(sqsService, configService);
}

bootstrap();
