import "reflect-metadata";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./modules/app.module.js";
import { rescueBaseOpenApiDocument } from "./openapi/document.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.APP_PUBLIC_URL ?? "http://localhost:5173",
    credentials: true
  });

  SwaggerModule.setup("docs", app, rescueBaseOpenApiDocument);

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
