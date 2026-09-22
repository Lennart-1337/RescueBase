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
    await agent.post(`/mpg/models/${model.body.id}/requirements`).send({ kind: "STK", title: "Sicherheitstechnische Kontrolle", justification: "Vom Hersteller für dieses Modell vorgeschrieben.", source: "Herstelleranweisung, Ausgabe 2026", mandatory: true, firstDueAt: "2027-09-14" }).expect(201);
    const currentModel = (await agent.get("/mpg/models").expect(200)).body.find((entry: { id: string }) => entry.id === model.body.id);
    expect(linked.body.version).toBe(1);
    await agent.post(`/mpg/models/${model.body.id}/review`).send({ version: currentModel.version, source: "Geprüft anhand der hinterlegten Herstelleranweisung." }).expect(201);

    const person = await agent.post("/mpg/people").send({ name: "Max Mustermann", birthDate: "1990-04-12", active: true }).expect(201);
    expect(person.body).toMatchObject({ name: "Max Mustermann", birthDate: expect.stringContaining("1990-04-12") });
    expect(person.body).not.toHaveProperty("internalCode");
    expect(person.body).not.toHaveProperty("affiliation");
    await agent.post("/mpg/people").send({ name: "Unzulässige Altstruktur", birthDate: "1985-03-10", internalCode: "INT-1" }).expect(400);
    const instructor = await agent.post("/mpg/people").send({ name: "Erika Einweiserin", birthDate: "1982-02-03", active: true }).expect(201);
    const qualification = await agent.post("/mpg/documents").field("personId", instructor.body.id)
      .attach("file", Buffer.from("%PDF-1.7\n%%EOF"), { filename: "qualifikation.pdf", contentType: "application/pdf" }).expect(201);
    const authorizedInstructor = await agent.patch(`/mpg/people/${instructor.body.id}`).send({ version: instructor.body.version,
      name: instructor.body.name, birthDate: "1982-02-03", active: true, instructorAuthorized: true,
      instructorAuthorization: "Schriftliche Beauftragung vom 01.09.2026", qualificationDocumentId: qualification.body.id }).expect(200);

    const legacy = await agent.post("/catalog/devices").send({ name: "Legacy AED", articleId: "article-tourniquet", locationId: "loc-main", active: true }).expect(201);
    const device = await agent.post("/mpg/devices").send({ name: "AED 1", mpgModelId: model.body.id,
      inventoryNumber: "MP-0001", serialNumber: "SN-001", acquisitionYear: 2026, commissionedAt: "2026-09-01", locationId: "loc-main" }).expect(201);
    expect(device.body).not.toHaveProperty("articleId");
    expect(device.body).not.toHaveProperty("responsiblePersonId");
    const devices = await agent.get("/mpg/devices").expect(200);
    expect(devices.body.map((entry: { id: string }) => entry.id)).toContain(device.body.id);
    expect(devices.body.map((entry: { id: string }) => entry.id)).not.toContain(legacy.body.id);
    await agent.post("/mpg/devices").send({ name: "Ungültig", articleId: "article-tourniquet", locationId: "loc-main" }).expect(400);
    const released = await agent.post(`/mpg/devices/${device.body.id}/release`).send({ version: device.body.version }).expect(201);
    expect(released.body.releasedAt).toBeTruthy();

    const requirementId = currentModel.requirements[0].id;
    const inspection = await agent.post(`/mpg/devices/${device.body.id}/inspections`).send({ requirementId,
      performedAt: "2026-09-14", result: "PASSED", personId: person.body.id, nextDueAt: "2027-09-14" }).expect(201);
    const finalizedInspection = await agent.post(`/mpg/inspections/${inspection.body.id}/finalize`).send({ version: inspection.body.version }).expect(201);
    await agent.patch(`/mpg/inspections/${inspection.body.id}`).send({ ...inspection.body, version: finalizedInspection.body.version }).expect(400);
    const correction = await agent.post(`/mpg/inspections/${inspection.body.id}/correct`).send({ requirementId,
      performedAt: "2026-09-15", result: "PASSED", personId: person.body.id, nextDueAt: "2027-09-14", reason: "Datum berichtigt" }).expect(201);
    expect(correction.body.correctionOfId).toBe(inspection.body.id);

    const training = await agent.post("/mpg/trainings").send({ modelId: model.body.id, performedAt: "2026-09-14",
      instructorId: authorizedInstructor.body.id, contents: "Bedienung, Funktionskontrolle und Verhalten bei Störungen", participantIds: [person.body.id] }).expect(201);
    expect(training.body.documentId).toBeNull();
    const signature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    let trainingVersion = training.body.version;
    for (const confirmation of training.body.confirmations) {
      const confirmed = await agent.post(`/mpg/trainings/${training.body.id}/confirm`).send({ version: trainingVersion,
        personId: confirmation.personId, role: confirmation.role, confirmationText: "Einweisung verstanden und persönlich bestätigt.", signaturePngDataUrl: signature }).expect(201);
      trainingVersion = confirmed.body.version;
    }
    const finalizedTraining = await agent.post(`/mpg/trainings/${training.body.id}/finalize`).send({ version: trainingVersion }).expect(201);
    expect(finalizedTraining.body.finalizedAt).toBeTruthy();

    await agent.post(`/mpg/devices/${device.body.id}/incidents`).send({ occurredAt: "2026-09-14", description: "Selbsttest fehlgeschlagen", effects: "Gerät kann keine Schockabgabe sicherstellen.", measures: "Gerät physisch gekennzeichnet und ausgesondert.", safetyRelevant: true }).expect(201);
    const record = await agent.get(`/mpg/devices/${device.body.id}`).expect(200);
    expect(record.body.status).toBe("BLOCKED");
    expect(record.body.reasons.join(" ")).toContain("Sicherheitsrelevanter Defekt");
    const pdf = await agent.get(`/mpg/exports/devices/${device.body.id}.pdf`).expect(200).expect("Content-Type", /pdf/);
    expect(pdf.body.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.body.length).toBeGreaterThan(3_000);
    const inventoryPdf = await agent.get("/mpg/exports/inventory.pdf").expect(200).expect("Content-Type", /pdf/);
    const labelPdf = await agent.get(`/mpg/exports/devices/${device.body.id}/label.pdf`).expect(200).expect("Content-Type", /pdf/);
    const trainingPdf = await agent.get(`/mpg/exports/trainings/${training.body.id}.pdf`).expect(200).expect("Content-Type", /pdf/);
    const personPdf = await agent.get(`/mpg/exports/people/${person.body.id}.pdf`).expect(200).expect("Content-Type", /pdf/);
    [inventoryPdf, labelPdf, trainingPdf, personPdf].forEach((report) => expect(report.body.length).toBeGreaterThan(1_000));
    await agent.get("/mpg/exports/inventory.csv").expect(404);

    await agent.post("/mpg/cylinders").send({ supplier: "Nicht zulässig", cylinderNumber: "O2-001", sizeLiters: 2,
      locationId: "loc-main", status: "FULL", inspectedAt: "2026-01-01", inspectionDueAt: "2031-01-01", expiresAt: "2028-01-01" }).expect(400);
    const cylinder = await agent.post("/mpg/cylinders").send({ cylinderNumber: "O2-001", sizeLiters: 2,
      locationId: "loc-main", status: "FULL", inspectedAt: "2026-01-01", inspectionDueAt: "2031-01-01", expiresAt: "2028-01-01" }).expect(201);
    await agent.post(`/mpg/cylinders/${cylinder.body.id}/assign`).send({ deviceId: device.body.id, version: cylinder.body.version }).expect(404);
    await agent.post(`/mpg/cylinders/${cylinder.body.id}/return`).send({ version: cylinder.body.version }).expect(201);
    await agent.patch(`/mpg/cylinders/${cylinder.body.id}`).send({ ...cylinder.body, version: cylinder.body.version + 1 }).expect(400);
  });

  it("denies the central module until a warehouse user is explicitly authorized", async () => {
    await request(app.getHttpServer()).get("/mpg/devices").expect(401);
    const warehouse = request.agent(app.getHttpServer());
    await warehouse.post("/auth/login").send({ email: "lager@rescuebase.local", password: "rescuebase-lager" }).expect(201);
    await warehouse.get("/mpg/devices").expect(403);
    await warehouse.get("/mpg/exports/inventory.pdf").expect(403);
    await warehouse.get("/mpg/exports/devices/unknown/label.pdf").expect(403);
    await warehouse.get("/mpg/documents/unknown").expect(403);
    const admin = request.agent(app.getHttpServer());
    await admin.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);
    await admin.put("/mpg-permissions/users/user-lager").send({ medicalDevicesManage: true }).expect(200);
    await warehouse.get("/mpg/devices").expect(200);
  });
});
