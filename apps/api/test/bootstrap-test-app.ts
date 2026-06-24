import { Test } from "@nestjs/testing";
import { execFileSync } from "node:child_process";
import { configureApp } from "../src/app-config.js";
import { AppModule } from "../src/modules/app.module.js";
import { createMysqlTestEnvironment } from "./mysql-test-environment.js";

type BootstrapOptions = {
  appPublicUrl?: string;
  databaseName: string;
};

export async function bootstrapTestApp(options: BootstrapOptions) {
  delete process.env.RESEND_API_KEY;
  process.env.RESEND_FROM = process.env.RESEND_FROM ?? "RescueBase Test <noreply@example.org>";
  process.env.APP_PUBLIC_URL = options.appPublicUrl ?? process.env.APP_PUBLIC_URL ?? "http://localhost:5173";

  const database = await createMysqlTestEnvironment(options.databaseName);
  process.env.DATABASE_URL = database.databaseUrl;
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    stdio: "inherit"
  });
  execFileSync("npm", ["run", "prisma:seed:dev"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    stdio: "inherit"
  });

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app, { enableDocs: false });
  await app.init();

  return {
    app,
    database,
    async close() {
      await app.close();
      await database.stop();
    }
  };
}
