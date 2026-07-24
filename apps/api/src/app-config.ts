import { ValidationPipe, type INestApplication } from "@nestjs/common";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { SwaggerModule } from "@nestjs/swagger";
import { rescueBaseOpenApiDocument } from "./openapi/document.js";

type AppConfigOptions = {
  enableDocs?: boolean;
};

export function configureApp(app: INestApplication, options: AppConfigOptions = {}): void {
  assertProductionConfig();
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.APP_PUBLIC_URL ?? "http://localhost:5173",
    credentials: true
  });

  if (options.enableDocs ?? process.env.NODE_ENV === "development") {
    SwaggerModule.setup("docs", app, rescueBaseOpenApiDocument);
  }
}

function assertProductionConfig(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  if (!process.env.RESEND_API_KEY?.trim()) {
    throw new Error("RESEND_API_KEY must be configured in production.");
  }
  if ((process.env.BETTER_AUTH_SECRET?.trim().length ?? 0) < 32) {
    throw new Error("BETTER_AUTH_SECRET muss in Produktion mindestens 32 Zeichen haben.");
  }
}
