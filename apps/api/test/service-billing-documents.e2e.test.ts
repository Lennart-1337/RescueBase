import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error supertest's export= declaration does not match its ESM runtime.
import request from "supertest";
import { bootstrapTestApp } from "./bootstrap-test-app.js";
import { PrismaService } from "../src/persistence/prisma.service.js";
jest.setTimeout(120_000);
const start = "2026-10-25T09:00:00Z",
  end = "2026-10-25T11:30:00Z";
const body = {
  kind: "OFFER",
  number: "012-SAN-2026",
  issuedOn: "2026-10-29",
  recipient: "Testverein\nHauptstraße 1\n47506 Neukirchen-Vluyn",
};
describe("service billing PDF integration", () => {
  let app: INestApplication,
    close: (() => Promise<void>) | undefined,
    directory: string;
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "rescuebase-billing-e2e-"));
    process.env.SERVICE_DOCUMENT_DIR = directory;
    const harness = await bootstrapTestApp({
      databaseName: "rescuebase_service_billing_documents",
    });
    app = harness.app;
    close = harness.close;
  });
  afterAll(async () => {
    await close?.();
    if (directory) await rm(directory, { recursive: true, force: true });
    delete process.env.SERVICE_DOCUMENT_DIR;
  });
  it("exports and archives snapshots, enforces access, version and unique numbers and permits completed billing", async () => {
    const admin = request.agent(app.getHttpServer()),
      warehouse = request.agent(app.getHttpServer());
    await admin
      .post("/auth/login")
      .send({ email: "admin@rescuebase.local", password: "rescuebase-admin" })
      .expect(201);
    await warehouse
      .post("/auth/login")
      .send({ email: "lager@rescuebase.local", password: "rescuebase-lager" })
      .expect(201);
    const person = (
      await admin
        .post("/services/people")
        .send({ name: "Prüfperson", qualifications: [] })
        .expect(201)
    ).body;
    let service = (
      await admin
        .post("/services")
        .send({
          title: "Abrechnungstest",
          eventType: "Sport",
          customer: "Testverein",
          location: "Neukirchen-Vluyn",
          startsAt: start,
          endsAt: end,
          eventStartsAt: start,
          eventEndsAt: end,
          positions: [
            {
              id: "posten",
              name: "Sanitäter",
              qualification: "PARAMEDIC",
              quantity: 1,
            },
          ],
          assignments: [
            {
              personId: person.id,
              positionId: "posten",
              startsAt: start,
              endsAt: end,
              hourlyRate: "14",
            },
          ],
        })
        .expect(201)
    ).body;
    const url = `/services/${service.id}/billing-documents`;
    await warehouse
      .post(url)
      .send({ ...body, version: service.version })
      .expect(403);
    await admin
      .post(url)
      .send({ ...body, version: service.version + 1 })
      .expect(409);
    await admin
      .post(url)
      .send({ ...body, kind: "INVOICE", version: service.version })
      .expect(400);
    const pdf = await admin
      .post(url)
      .send({ ...body, version: service.version })
      .expect(201)
      .expect("Content-Type", /application\/pdf/);
    expect(pdf.body.subarray(0, 5).toString()).toBe("%PDF-");
    service = (await admin.get(`/services/${service.id}`).expect(200)).body;
    expect(service.documents).toHaveLength(1);
    expect(service.offerSentAt).toBeNull();
    expect(service.invoiceSentAt).toBeNull();
    const documentId = service.documents[0].id;
    const saved = await admin
      .get(`/services/${service.id}/documents/${documentId}`)
      .expect(200);
    expect(saved.body).toEqual(pdf.body);
    await warehouse
      .get(`/services/${service.id}/documents/${documentId}`)
      .expect(403);
    await admin
      .post(url)
      .send({ ...body, number: "012-san-2026", version: service.version })
      .expect(409);
    const db = app.get(PrismaService);
    expect(
      await db.serviceDocument.count({ where: { serviceId: service.id } }),
    ).toBe(1);
    await db.serviceAssignment.updateMany({
      where: { serviceId: service.id },
      data: {
        actualStartsAt: new Date(start),
        actualEndsAt: new Date("2026-10-25T12:30:00Z"),
      },
    });
    await db.serviceEvent.update({
      where: { id: service.id },
      data: { status: "COMPLETED" },
    });
    await admin
      .post(url)
      .send({ ...body, kind: "INVOICE", version: service.version })
      .expect(201);
    const invoice = await db.serviceDocument.findFirstOrThrow({
      where: { serviceId: service.id, billingKind: "INVOICE" },
    });
    expect(invoice.billingSnapshot).toMatchObject({
      total: "91.00",
      validUntil: null,
    });
    expect(
      await db.auditEvent.count({
        where: {
          entityId: service.id,
          action: "SERVICE_BILLING_DOCUMENT_CREATED",
        },
      }),
    ).toBe(2);
    service = (await admin.get(`/services/${service.id}`).expect(200)).body;
    await admin
      .delete(`/services/${service.id}`)
      .send({ version: service.version })
      .expect(200);
    await admin
      .post(url)
      .send({ ...body, number: "013-SAN-2026", version: service.version + 1 })
      .expect(404);
    await admin
      .get(`/services/${service.id}/documents/${documentId}`)
      .expect(404);
  });
});
