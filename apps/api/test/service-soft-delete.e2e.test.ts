import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error supertest's export= declaration does not match its ESM runtime.
import request from "supertest";
import { bootstrapTestApp } from "./bootstrap-test-app.js";
import { PrismaService } from "../src/persistence/prisma.service.js";
jest.setTimeout(120_000);
const start = "2026-11-01T09:00:00Z", end = "2026-11-01T17:00:00Z";
const base = { title: "Löschprüfung", eventType: "Sport", customer: "Testverein", location: "Köln",
  eventStartsAt: start, eventEndsAt: end, startsAt: start, endsAt: end, status: "PLANNING" };
describe("service soft deletion integration", () => {
  let app: INestApplication, close: (() => Promise<void>) | undefined, directory: string;
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "rescuebase-soft-delete-"));
    process.env.SERVICE_DOCUMENT_DIR = directory;
    const harness = await bootstrapTestApp({ databaseName: "rescuebase_service_soft_delete" });
    app = harness.app; close = harness.close;
  });
  afterAll(async () => {
    await close?.();
    if (directory) await rm(directory, { recursive: true, force: true });
    delete process.env.SERVICE_DOCUMENT_DIR;
  });
  it("retains service data and attachments, removes statistics and resource conflicts, and prevents access", async () => {
    const admin = request.agent(app.getHttpServer()), warehouse = request.agent(app.getHttpServer());
    await admin.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);
    await warehouse.post("/auth/login").send({ email: "lager@rescuebase.local", password: "rescuebase-lager" }).expect(201);
    const db = app.get(PrismaService);
    const person = (await admin.post("/services/people").send({ name: "Prüfperson", qualifications: [] }).expect(201)).body;
    const vehicle = (await admin.post("/services/vehicles").send({ name: "MTW", registration: "TEST", type: "MTW", active: true, ready: true }).expect(201)).body;
    const data = (positionId: string) => ({ ...base,
      positions: [{ id: positionId, name: "Posten", qualification: "PARAMEDIC", quantity: 1 }],
      assignments: [{ personId: person.id, positionId, startsAt: start, endsAt: end }],
      reservations: [{ kind: "VEHICLE", resourceId: vehicle.id, startsAt: start, endsAt: end }] });
    let service = (await admin.post("/services").send(data("position-a")).expect(201)).body;
    const peer = (await admin.post("/services").send({ ...data("position-b"), title: "Anderer Dienst" }).expect(201)).body;
    await db.serviceEvent.updateMany({ where: { id: { in: [service.id, peer.id] } }, data: { status: "PLANNING" } });
    const conflicts = (await admin.get(`/services/${peer.id}`).expect(200)).body.warnings;
    expect(conflicts.some((w: { code: string }) => w.code === "RESOURCE_CONFLICT")).toBe(true);
    expect(conflicts.some((w: { code: string }) => w.code === "PERSON_CONFLICT")).toBe(true);
    const upload = (await admin.post(`/services/${service.id}/documents`).field("version", String(service.version))
      .attach("file", Buffer.from("%PDF-1.7\n%%EOF"), { filename: "auftrag.pdf", contentType: "application/pdf" }).expect(201)).body;
    service = (await admin.get(`/services/${service.id}`).expect(200)).body;
    await warehouse.delete(`/services/${service.id}`).send({ version: service.version }).expect(403);
    await admin.delete(`/services/${service.id}`).send({ version: service.version - 1 }).expect(409);
    // Explicit deletion also works for completed records without editing their contents first.
    await db.serviceEvent.update({ where: { id: service.id }, data: { status: "COMPLETED" } });
    const deleted = (await admin.delete(`/services/${service.id}`).send({ version: service.version }).expect(200)).body;
    expect(deleted).toMatchObject({ id: service.id, version: service.version + 1, deletedAt: expect.any(String) });
    const retained = await db.serviceEvent.findUniqueOrThrow({ where: { id: service.id }, include: { assignments: true, reservations: true, documents: true } });
    expect(retained.deletedAt).not.toBeNull();
    expect(retained.assignments).toHaveLength(1);
    expect(retained.reservations).toHaveLength(1);
    expect(retained.documents).toHaveLength(1);
    expect((await readFile(join(directory, retained.documents[0]!.storageKey))).toString()).toContain("%PDF");
    expect(await db.auditEvent.count({ where: { entityId: service.id, action: "SERVICE_DELETED" } })).toBe(1);
    const list = (await admin.get("/services").expect(200)).body;
    expect(list.some((row: { id: string }) => row.id === service.id)).toBe(false);
    const statistics = (await admin.get("/services/statistics").expect(200)).body;
    expect(statistics.rows.some((row: { id: string }) => row.id === service.id)).toBe(false);
    const csv = await admin.get("/services/statistics.csv").expect(200);
    expect(csv.text).not.toContain("Löschprüfung");
    const updatedPeer = (await admin.get(`/services/${peer.id}`).expect(200)).body;
    expect(updatedPeer.warnings.some((w: { code: string }) => ["RESOURCE_CONFLICT", "PERSON_CONFLICT"].includes(w.code))).toBe(false);
    await admin.get(`/services/${service.id}`).expect(404);
    await admin.put(`/services/${service.id}`).send({ version: deleted.version, title: "Zurück" }).expect(404);
    await admin.post(`/services/${service.id}/transition`).send({ version: deleted.version, status: "REVIEW", reason: "Test" }).expect(404);
    await admin.post(`/services/${service.id}/calculations`).send({ version: deleted.version, method: "MAURER", input: {} }).expect(404);
    await admin.get(`/services/${service.id}/documents`).expect(404);
    await admin.get(`/services/${service.id}/documents/${upload.id}`).expect(404);
    await admin.post(`/services/${service.id}/documents`).field("version", String(deleted.version))
      .attach("file", Buffer.from("%PDF-1.7\n%%EOF"), { filename: "neu.pdf", contentType: "application/pdf" }).expect(404);
    await admin.delete(`/services/${service.id}`).send({ version: deleted.version }).expect(404);
  });
});
