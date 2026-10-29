import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
// @ts-expect-error supertest's export= declaration does not match its ESM runtime.
import request from "supertest";
import { bootstrapTestApp } from "./bootstrap-test-app.js";
import { PrismaService } from "../src/persistence/prisma.service.js";
jest.setTimeout(120_000);
const start = "2026-11-01T08:00:00Z", end = "2026-11-01T18:00:00Z";
describe("multiple attendance periods per service and person", () => {
  let app: INestApplication, close: (() => Promise<void>) | undefined;
  beforeAll(async () => {
    const harness = await bootstrapTestApp({ databaseName: "rescuebase_repeat_person" });
    app = harness.app; close = harness.close;
  });
  afterAll(async () => close?.());
  it("persists, edits and removes separate periods without merging their identity", async () => {
    const admin = request.agent(app.getHttpServer());
    await admin.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);
    const person = (await admin.post("/services/people").send({ name: "Morgens und abends", qualifications: [{ qualification: "SANITARIAN" }] }).expect(201)).body;
    const first = { id: "morning", personId: person.id, positionId: "position", startsAt: start, endsAt: "2026-11-01T10:00:00Z", hourlyRate: "10.00" };
    const second = { ...first, id: "evening", startsAt: "2026-11-01T16:00:00Z", endsAt: end };
    let service = (await admin.post("/services").send({ title: "Zwei Teilnahmezeiten", customer: "Verein", eventType: "Sport", location: "Köln",
      startsAt: start, endsAt: end, eventStartsAt: start, eventEndsAt: end,
      positions: [{ id: "position", name: "Posten", qualification: "SANITARIAN", quantity: 1 }],
      assignments: [first, second] }).expect(201)).body;
    expect(service.assignments).toHaveLength(2);
    expect(service.costs.planned.revenue).toBe("75.00");
    service = (await admin.put(`/services/${service.id}`).send({ version: service.version,
      assignments: [first, { ...second, startsAt: "2026-11-01T15:00:00Z" }] }).expect(200)).body;
    expect(service.assignments.find((a: { id: string }) => a.id === "morning").endsAt).toBe("2026-11-01T10:00:00.000Z");
    expect(service.costs.planned.revenue).toBe("85.00");
    const db = app.get(PrismaService);
    await db.serviceEvent.update({ where: { id: service.id }, data: { status: "COMPLETED" } });
    const statistics = (await admin.get("/services/statistics").expect(200)).body;
    const row = statistics.rows.find((r: { id: string }) => r.id === service.id);
    expect(row).toMatchObject({ assignedPersonnel: 1, plannedMinutes: 300, actualMinutes: 300 });
    await db.serviceEvent.update({ where: { id: service.id }, data: { status: "PLANNING" } });
    service = (await admin.put(`/services/${service.id}`).send({ version: service.version, assignments: [first] }).expect(200)).body;
    expect(service.assignments.map((a: { id: string }) => a.id)).toEqual(["morning"]);
    expect(await db.serviceAssignment.count({ where: { serviceId: service.id, personId: person.id } })).toBe(1);
    // A second period may be restored; overlaps remain warnings and never masquerade as extra people.
    service = (await admin.put(`/services/${service.id}`).send({ version: service.version,
      positions: [{ ...service.positions[0], quantity: 2 }], assignments: [first, { ...second, startsAt: start, endsAt: first.endsAt }] }).expect(200)).body;
    expect(service.warnings.filter((w: { code: string }) => w.code === "PERSON_CONFLICT")).toHaveLength(2);
    expect(service.warnings.some((w: { code: string }) => w.code === "UNDERSTAFFED")).toBe(true);
    service = (await admin.post(`/services/${service.id}/transition`).send({ version: service.version,
      status: "RELEASED", reason: "Abgestimmte Doppelbelegung" }).expect(201)).body;
    expect(service.status).toBe("RELEASED");
    const peer = (await admin.post("/services").send({ title: "Anderer Dienst", customer: "Verein", eventType: "Sport", location: "Köln",
      startsAt: start, endsAt: end, eventStartsAt: start, eventEndsAt: end,
      positions: [{ id: "peer-position", name: "Posten", qualification: "SANITARIAN", quantity: 1 }],
      assignments: [{ ...first, id: "peer-assignment", positionId: "peer-position" }] }).expect(201)).body;
    await db.serviceEvent.update({ where: { id: peer.id }, data: { status: "PLANNING" } });
    const read = (await admin.get(`/services/${service.id}`).expect(200)).body;
    expect(read.warnings.some((w: { message: string }) => w.message.includes("anderen Dienst"))).toBe(true);
  });
});
