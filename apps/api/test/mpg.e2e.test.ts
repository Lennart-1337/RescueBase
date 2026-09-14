import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
// @ts-expect-error supertest ships export= typings; default import is correct with ts-jest runtime.
import request from "supertest";
import { bootstrapTestApp } from "./bootstrap-test-app.js";

jest.setTimeout(45_000);

describe("MPG module", () => {
  let app: INestApplication;
  let close: (() => Promise<void>) | undefined;
  beforeAll(async () => { const harness = await bootstrapTestApp({ databaseName: "rescuebase_mpg_test" }); app = harness.app; close = harness.close; });
  afterAll(async () => close?.());

  it("builds an immutable device record and blocks it on a safety incident", async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);

    const model = await agent.post("/mpg/models").send({ name: "Test AED", manufacturer: "Rescue Test", manufacturerAddress: "Prüfstraße 1, Berlin", productType: "AED" }).expect(201);
    const instructions = await agent.post("/mpg/documents").field("modelId", model.body.id).attach("file", Buffer.from("%PDF-1.7\n%%EOF"), { filename: "gebrauchsanweisung.pdf", contentType: "application/pdf" }).expect(201);
    const linked = await agent.patch(`/mpg/models/${model.body.id}`).send({ version: 0, instructionsDocumentId: instructions.body.id }).expect(200);
    await agent.post(`/mpg/models/${model.body.id}/requirements`).send({ kind: "STK", title: "Sicherheitstechnische Kontrolle", source: "Herstelleranweisung, Ausgabe 2026", mandatory: true, firstDueAt: "2027-09-14" }).expect(201);
    const currentModel = (await agent.get("/mpg/models").expect(200)).body.find((entry: { id: string }) => entry.id === model.body.id);
    expect(linked.body.version).toBe(1);
    await agent.post(`/mpg/models/${model.body.id}/review`).send({ version: currentModel.version, source: "Geprüft anhand der hinterlegten Herstelleranweisung." }).expect(201);

    const person = await agent.post("/mpg/people").send({ name: "Max Mustermann", internalCode: "MP-001", affiliation: "Sanitätsdienst", active: true }).expect(201);
    const device = await agent.post("/mpg/devices").send({ name: "AED 1", articleId: "article-tourniquet", mpgModelId: model.body.id,
      inventoryNumber: "MP-0001", serialNumber: "SN-001", acquisitionYear: 2026, commissionedAt: "2026-09-01", locationId: "loc-main", responsiblePersonId: person.body.id }).expect(201);
    const released = await agent.post(`/mpg/devices/${device.body.id}/release`).send({ version: device.body.version }).expect(201);
    expect(released.body.releasedAt).toBeTruthy();

    await agent.post(`/mpg/devices/${device.body.id}/incidents`).send({ occurredAt: "2026-09-14", description: "Selbsttest fehlgeschlagen", measures: "Gerät physisch gekennzeichnet und ausgesondert.", safetyRelevant: true }).expect(201);
    const record = await agent.get(`/mpg/devices/${device.body.id}`).expect(200);
    expect(record.body.status).toBe("BLOCKED");
    expect(record.body.reasons.join(" ")).toContain("Sicherheitsrelevanter Defekt");
    const pdf = await agent.get(`/mpg/exports/devices/${device.body.id}.pdf`).expect(200).expect("Content-Type", /pdf/);
    expect(pdf.body.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("denies the central module until a warehouse user is explicitly authorized", async () => {
    const warehouse = request.agent(app.getHttpServer());
    await warehouse.post("/auth/login").send({ email: "lager@rescuebase.local", password: "rescuebase-lager" }).expect(201);
    await warehouse.get("/mpg/devices").expect(403);
    const admin = request.agent(app.getHttpServer());
    await admin.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);
    await admin.put("/mpg-permissions/users/user-lager").send({ medicalDevicesManage: true }).expect(200);
    await warehouse.get("/mpg/devices").expect(200);
  });
});
