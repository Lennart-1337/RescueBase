import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
// @ts-expect-error supertest's export= declaration does not match its ESM runtime.
import request from "supertest";
import { bootstrapTestApp } from "./bootstrap-test-app.js";
import { PrismaService } from "../src/persistence/prisma.service.js";
jest.setTimeout(120_000);
describe("legacy qualification expiry correction", () => {
  let app: INestApplication, close: (() => Promise<void>) | undefined;
  beforeAll(async () => {
    const harness = await bootstrapTestApp({ databaseName: "rescuebase_qualification_dates" });
    app = harness.app; close = harness.close;
  });
  afterAll(async () => close?.());
  test("loads year 0026 without crashing or certifying it, then accepts an explicit correction", async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);
    const proof = { qualification: "PARAMEDIC", validUntil: "2026-11-01", recognizedQualifications: [] };
    const person = (await agent.post("/services/people").send({ name: "Datumsprüfung", qualifications: [proof] }).expect(201)).body;
    const start = "2026-11-01T08:00:00Z", end = "2026-11-01T10:00:00Z";
    const service = (await agent.post("/services").send({
      title: "Datumsprüfung", customer: "Testverein", eventType: "Sport", location: "Köln",
      startsAt: start, endsAt: end, eventStartsAt: start, eventEndsAt: end,
      positions: [{ id: "p", name: "EVT 01", qualification: "PARAMEDIC", quantity: 1 }],
      assignments: [{ personId: person.id, positionId: "p", startsAt: start, endsAt: end }],
    }).expect(201)).body;
    const db = app.get(PrismaService);
    await db.$executeRaw`UPDATE PersonQualification SET validUntil = '0026-11-01 00:00:00.000' WHERE personId = ${person.id}`;
    const readPerson = async () => {
      const catalog = (await agent.get("/services/catalog").expect(200)).body;
      return catalog.people.find((row: { id: string }) => row.id === person.id);
    };
    expect((await readPerson()).qualifications[0].validUntil).toBe("0026-11-01");
    const read = (await agent.get(`/services/${service.id}`).expect(200)).body;
    expect(read.warnings.some((w: { code: string }) => w.code === "QUALIFICATION")).toBe(true);
    await agent.put(`/services/people/${person.id}`).send({ ...person, qualifications: [{ ...proof, validUntil: "0026-11-01" }] }).expect(400);
    expect((await readPerson()).qualifications[0].validUntil).toBe("0026-11-01");
    await db.$transaction(async (tx) => {
      const [settings] = await tx.$queryRaw<{ mode: string }[]>`SELECT @@SESSION.sql_mode AS mode`;
      try {
        await tx.$executeRaw`SET SESSION sql_mode = ''`;
        await tx.$executeRaw`UPDATE PersonQualification SET validUntil = '0000-00-00 00:00:00.000' WHERE personId = ${person.id}`;
      } finally {
        await tx.$executeRaw`SET SESSION sql_mode = ${settings!.mode}`;
      }
    });
    expect((await readPerson()).qualifications[0].validUntil).toBe("0000-00-00");
    const invalid = (await agent.get(`/services/${service.id}`).expect(200)).body;
    expect(invalid.warnings.find((w: { code: string }) => w.code === "QUALIFICATION").message).toContain("ungültig");
    await agent.put(`/services/people/${person.id}`).send({ ...person, qualifications: [proof] }).expect(200);
    expect((await readPerson()).qualifications[0].validUntil).toBe("2026-11-01");
    const corrected = (await agent.get(`/services/${service.id}`).expect(200)).body;
    expect(corrected.warnings.some((w: { code: string }) => w.code === "QUALIFICATION")).toBe(false);
  });
});
