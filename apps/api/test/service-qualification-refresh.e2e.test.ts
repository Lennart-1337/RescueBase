import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
// @ts-expect-error supertest's export= declaration does not match its ESM runtime.
import request from "supertest";
import { bootstrapTestApp } from "./bootstrap-test-app.js";
import { PrismaService } from "../src/persistence/prisma.service.js";
jest.setTimeout(120_000);
const start = "2026-11-01T08:00:00Z", end = "2026-11-01T10:00:00Z";
describe("live qualification planning hints", () => {
  let app: INestApplication, close: (() => Promise<void>) | undefined;
  beforeAll(async () => {
    const harness = await bootstrapTestApp({ databaseName: "rescuebase_qualification_refresh" });
    app = harness.app; close = harness.close;
  });
  afterAll(async () => close?.());
  test("refreshes proof changes immediately and ignores stale copied role values", async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);
    let person = (await agent.post("/services/people").send({ name: "Lennart Beispiel", active: true, qualifications: [] }).expect(201)).body;
    const service = (await agent.post("/services").send({
      title: "Qualifikationsprüfung", customer: "Testverein", eventType: "Sport", location: "Köln",
      startsAt: start, endsAt: end, eventStartsAt: start, eventEndsAt: end,
      positions: [{ id: "p", name: "EVT 01", qualification: "PARAMEDIC", quantity: 1 }],
      assignments: [{ personId: person.id, positionId: "p", startsAt: start, endsAt: end }],
    }).expect(201)).body;
    expect(service.assignments[0].qualification).toBe("PARAMEDIC");
    expect(service.warnings.some((w: { code: string }) => w.code === "QUALIFICATION")).toBe(true);
    const db = app.get(PrismaService);
    await db.serviceAssignment.update({ where: { id: service.assignments[0].id }, data: { qualification: "SANITARIAN" } });
    person = (await agent.put(`/services/people/${person.id}`).send({
      ...person, qualifications: [{ qualification: "PARAMEDIC", validUntil: null, recognizedQualifications: [] }],
    }).expect(200)).body;
    let read = (await agent.get(`/services/${service.id}`).expect(200)).body;
    expect(read.warnings.some((w: { code: string }) => w.code === "QUALIFICATION")).toBe(false);
    expect(read.assignments[0].qualification).toBe("PARAMEDIC");
    expect((await db.serviceAssignment.findUniqueOrThrow({ where: { id: service.assignments[0].id } })).qualification).toBe("SANITARIAN");
    const list = (await agent.get("/services").expect(200)).body;
    expect(list.find((row: { id: string }) => row.id === service.id).warnings.some((w: { code: string }) => w.code === "QUALIFICATION")).toBe(false);
    read = (await agent.post(`/services/${service.id}/transition`).send({ version: read.version, status: "PLANNING" }).expect(201)).body;
    read = (await agent.post(`/services/${service.id}/transition`).send({ version: read.version, status: "RELEASED" }).expect(201)).body;
    read = (await agent.put(`/services/${service.id}`).send({ version: read.version, materialRate: "42.00" }).expect(200)).body;
    expect(read.status).toBe("RELEASED");
    person = (await agent.put(`/services/people/${person.id}`).send({
      ...person, qualifications: [{ qualification: "PARAMEDIC", validUntil: "2026-10-31", recognizedQualifications: [] }],
    }).expect(200)).body;
    read = (await agent.get(`/services/${service.id}`).expect(200)).body;
    expect(read.warnings.find((w: { code: string }) => w.code === "QUALIFICATION").message).toContain("gültig");
    person = (await agent.put(`/services/people/${person.id}`).send({
      ...person, qualifications: [{ qualification: "PHYSICIAN", validUntil: null, recognizedQualifications: [] }],
    }).expect(200)).body;
    read = (await agent.get(`/services/${service.id}`).expect(200)).body;
    expect(read.warnings.some((w: { code: string }) => w.code === "QUALIFICATION")).toBe(true);
    await agent.put(`/services/people/${person.id}`).send({
      ...person, qualifications: [{ qualification: "PHYSICIAN", validUntil: null, recognizedQualifications: ["PARAMEDIC"] }],
    }).expect(200);
    read = (await agent.get(`/services/${service.id}`).expect(200)).body;
    expect(read.warnings.some((w: { code: string }) => w.code === "QUALIFICATION")).toBe(false);
  });
});
