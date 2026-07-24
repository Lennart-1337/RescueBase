import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
import { compare } from "bcryptjs";
import { bootstrapTestApp } from "./bootstrap-test-app.js";
import { AccountActivationService } from "../src/auth/account-activation.service.js";
import { PrismaService } from "../src/persistence/prisma.service.js";

jest.setTimeout(30_000);

describe("Better Auth account activation", () => {
  let app: INestApplication;
  let close: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const harness = await bootstrapTestApp({ databaseName: "rescuebase_activation_test" });
    app = harness.app;
    close = harness.close;
  });

  afterAll(async () => { await close?.(); });

  it("invalidates legacy credentials and creates a Better Auth credential account", async () => {
    const prisma = app.get(PrismaService);
    const activations = app.get(AccountActivationService);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "admin@rescuebase.local" } });
    const activation = await activations.create(user.id);

    expect(await activations.isValid(activation.token)).toBe(true);
    await activations.activate(activation.token, "a-new-secure-password");

    const migrated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const account = await prisma.account.findUniqueOrThrow({ where: { providerId_accountId: { providerId: "credential", accountId: user.id } } });
    expect(migrated).toMatchObject({ active: true, activationRequired: false, emailVerified: true, passwordHash: null, twoFactorEnabled: false });
    expect(await compare("rescuebase-admin", migrated.passwordHash ?? "")).toBe(false);
    expect(account.password).toBeTruthy();
    await expect(activations.activate(activation.token, "another-secure-password")).rejects.toThrow("Aktivierungslink");
  });
});
