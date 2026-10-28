import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
// @ts-expect-error supertest's export= declaration does not match its ESM runtime.
import request from "supertest";
import { bootstrapTestApp } from "./bootstrap-test-app.js";
import { PrismaService } from "../src/persistence/prisma.service.js";
jest.setTimeout(120_000);
describe("billing milestone integration", () => {
  let app: INestApplication, close: (() => Promise<void>) | undefined;
  beforeAll(async () => {
    const harness = await bootstrapTestApp({ databaseName: "rescuebase_billing_status" });
    app = harness.app; close = harness.close;
  });
  afterAll(async () => close?.());
  it("tracks finance after completion with timestamps, permissions and version checks", async () => {
    const admin = request.agent(app.getHttpServer()), warehouse = request.agent(app.getHttpServer());
    await admin.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);
    await warehouse.post("/auth/login").send({ email: "lager@rescuebase.local", password: "rescuebase-lager" }).expect(201);
    const start = "2026-11-01T08:00:00Z", end = "2026-11-01T10:00:00Z";
    const service = (await admin.post("/services").send({ title: "Abrechnungsprüfung", eventType: "Sport", customer: "Verein", location: "Köln",
      startsAt: start, endsAt: end, eventStartsAt: start, eventEndsAt: end }).expect(201)).body;
    expect(service).toMatchObject({ offerSentAt: null, invoiceSentAt: null, invoicePaidAt: null });
    const db = app.get(PrismaService), path = `/services/${service.id}/billing-status`;
    const flags = { version: service.version, offerSent: true, invoiceSent: true, invoicePaid: false };
    await warehouse.post(path).send(flags).expect(403);
    await admin.post(path).send({ version: service.version }).expect(400);
    await db.serviceEvent.update({ where: { id: service.id }, data: { status: "RELEASED" } });
    let result = (await admin.post(path).send(flags).expect(201)).body;
    expect(result).toMatchObject({ status: "RELEASED", offerSentAt: expect.any(String), invoiceSentAt: expect.any(String), invoicePaidAt: null, version: service.version + 1 });
    const sent = result.invoiceSentAt;
    await admin.post(path).send(flags).expect(409);
    await db.serviceEvent.update({ where: { id: service.id }, data: { status: "COMPLETED" } });
    result = (await admin.post(path).send({ ...flags, version: result.version, invoicePaid: true }).expect(201)).body;
    expect(result).toMatchObject({ status: "COMPLETED", invoiceSentAt: sent, invoicePaidAt: expect.any(String) });
    expect((await admin.get(`/services/${service.id}`).expect(200)).body.invoicePaidAt).toBe(result.invoicePaidAt);
    result = (await admin.post(path).send({ ...flags, version: result.version, offerSent: false, invoiceSent: false, invoicePaid: true }).expect(201)).body;
    expect(result).toMatchObject({ offerSentAt: null, invoiceSentAt: null, invoicePaidAt: expect.any(String) });
    expect(await db.auditEvent.count({ where: { entityId: service.id, action: "SERVICE_BILLING_STATUS_CHANGED" } })).toBe(3);
    await db.serviceEvent.update({ where: { id: service.id }, data: { status: "CANCELLED" } });
    result = (await admin.post(path).send({ ...flags, version: result.version, offerSent: false, invoiceSent: false }).expect(201)).body;
    expect(result).toMatchObject({ status: "CANCELLED", invoicePaidAt: null });
    await admin.delete(`/services/${service.id}`).send({ version: result.version }).expect(200);
    await admin.post(path).send({ ...flags, version: result.version + 1 }).expect(404);
  });
});
