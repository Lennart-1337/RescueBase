import "reflect-metadata";
import { existsSync } from "node:fs";
import { NestFactory } from "@nestjs/core";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { configureApp } from "./app-config.js";
import { BetterAuthService } from "./auth/better-auth.service.js";
import { AppModule } from "./modules/app.module.js";

async function bootstrap(): Promise<void> {
  for (const envFile of [".env", "../../.env"]) {
    if (existsSync(envFile)) {
      process.loadEnvFile?.(envFile);
      break;
    }
  }
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use("/api/auth", toNodeHandler(app.get(BetterAuthService).instance));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  configureApp(app);

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
