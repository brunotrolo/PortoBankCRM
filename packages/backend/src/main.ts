import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["log", "error", "warn", "debug"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.setGlobalPrefix("api/v1");

  await app.listen(process.env.PORT ?? 3000, "0.0.0.0");
  console.log(`Porto Bank CRM rodando na porta ${process.env.PORT ?? 3000}`);
}

bootstrap();
