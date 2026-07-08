import "reflect-metadata";
import { existsSync } from "node:fs";
import { NestFactory } from "@nestjs/core";
import { configureApp } from "./app-config.js";
import { AppModule } from "./modules/app.module.js";

async function bootstrap(): Promise<void> {
  for (const envFile of [".env", "../../.env"]) {
    if (existsSync(envFile)) {
      process.loadEnvFile?.(envFile);
      break;
    }
  }
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
