import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
// @ts-expect-error supertest's export= declaration does not match its ESM runtime.
import request from "supertest";
import { bootstrapTestApp } from "./bootstrap-test-app.js";
import { PrismaService } from "../src/persistence/prisma.service.js";
import { defaultBillingSettings } from "../src/settings/service-billing/defaults.js";
jest.setTimeout(120_000);
describe("service billing settings integration", () => {
  let app: INestApplication, close: (() => Promise<void>) | undefined;
  beforeAll(async () => {
    const harness = await bootstrapTestApp({ databaseName: "rescuebase_service_billing_settings" });
    app = harness.app; close = harness.close;
  });
  afterAll(async () => close?.());
  it("allows admin edits, read-only service access and rejects stale or invalid writes atomically", async () => {
    const admin = request.agent(app.getHttpServer()), warehouse = request.agent(app.getHttpServer());
    await admin.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);
    await warehouse.post("/auth/login").send({ email: "lager@rescuebase.local", password: "rescuebase-lager" }).expect(201);
    const path = "/admin/settings/service-billing", db = app.get(PrismaService);
    const first = (await admin.get(path).expect(200)).body;
    expect(first).toEqual({ ...defaultBillingSettings, version: 0 });
    expect(await db.serviceBillingSettings.count()).toBe(0);
    await warehouse.get(path).expect(403);
    await warehouse.get("/services/billing-settings").expect(403);
    const user = await db.user.findUniqueOrThrow({ where: { email: "lager@rescuebase.local" } });
    await admin.put(`/service-permissions/users/${user.id}`).send({ servicesManage: true }).expect(200);
    expect((await warehouse.get("/services/billing-settings").expect(200)).body).toEqual(first);
    await warehouse.post(path).send({ ...first, street: "Unerlaubte Straße 1" }).expect(403);
    await admin.post(path).send({ ...first, iban: "DE09354500001420201855" }).expect(400);
    await admin.post(path).send({ street: "Unvollständig", version: 0 }).expect(400);
    expect(await db.serviceBillingSettings.count()).toBe(0);
    const next = (await admin.post(path).send({ ...first, street: "Neue Straße 12", paymentTermDays: 21 }).expect(201)).body;
    expect(next).toMatchObject({ street: "Neue Straße 12", paymentTermDays: 21, version: 1 });
    await admin.post(path).send(first).expect(409);
    expect((await admin.get(path).expect(200)).body).toEqual(next);
    expect((await warehouse.get("/services/billing-settings").expect(200)).body).toEqual(next);
    const responses = await Promise.all([
      admin.post(path).send({ ...next, city: "Ort A" }),
      admin.post(path).send({ ...next, city: "Ort B" }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const saved = (await admin.get(path).expect(200)).body;
    expect(saved.version).toBe(2);
    expect(["Ort A", "Ort B"]).toContain(saved.city);
    expect(await db.auditEvent.count({ where: { entityType: "ServiceBillingSettings", action: "SERVICE_BILLING_SETTINGS_UPDATED" } })).toBe(2);
    const lastAudit = await db.auditEvent.findFirstOrThrow({ where: { entityType: "ServiceBillingSettings" }, orderBy: { createdAt: "desc" } });
    expect(lastAudit.actorLabel).not.toBe("Admin");
  });
});
