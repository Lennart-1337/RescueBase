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
const base = {
  title: "Stadtlauf",
  eventType: "Sport",
  customer: "Sportverein",
  location: "Köln",
  eventStartsAt: "2026-11-01T10:00:00Z",
  eventEndsAt: "2026-11-01T16:00:00Z",
  startsAt: "2026-11-01T09:00:00Z",
  endsAt: "2026-11-01T17:00:00Z",
  supportOnly: true,
};
describe("integrated service planning", () => {
  let app: INestApplication,
    close: (() => Promise<void>) | undefined,
    directory: string;
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "rescuebase-service-docs-"));
    process.env.SERVICE_DOCUMENT_DIR = directory;
    const harness = await bootstrapTestApp({
      databaseName: "rescuebase_service_test",
    });
    app = harness.app;
    close = harness.close;
  });
  afterAll(async () => {
    await close?.();
    if (directory) await rm(directory, { recursive: true, force: true });
    delete process.env.SERVICE_DOCUMENT_DIR;
  });
  it("persists support orders, snapshots rates, warns on conflicts, releases, corrects and exports", async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post("/auth/login")
      .send({ email: "admin@rescuebase.local", password: "rescuebase-admin" })
      .expect(201);
    const p = (
      await agent
        .post("/services/people")
        .send({
          name: "Erika Helferin",
          active: true,
          leader: true,
          qualifications: [
            {
              qualification: "SANITARIAN",
              validUntil: null,
              recognizedQualifications: [],
            },
          ],
        })
        .expect(201)
    ).body;
    const v = (
      await agent
        .post("/services/vehicles")
        .send({
          name: "KTW 1",
          registration: "K-DL 123",
          type: "KTW",
          ready: true,
          active: true,
        })
        .expect(201)
    ).body;
    const t = (
      await agent
        .post("/services/tariffs")
        .send({
          name: "Sanitäterstunde",
          category: "PERSONNEL",
          unit: "h",
          costRate: "12.50",
          saleRate: "20",
          active: true,
        })
        .expect(201)
    ).body;
    let service = (
      await agent
        .post("/services")
        .send({
          ...base,
          positions: [
            {
              id: "post",
              name: "Sanitätsposten",
              qualification: "SANITARIAN",
              leader: false,
              quantity: 1,
            },
          ],
          assignments: [
            {
              id: "a1",
              personId: p.id,
              positionId: "post",
              qualification: "SANITARIAN",
              startsAt: base.startsAt,
              endsAt: base.endsAt,
            },
          ],
          reservations: [
            {
              id: "r1",
              kind: "VEHICLE",
              resourceId: v.id,
              startsAt: base.startsAt,
              endsAt: base.endsAt,
            },
          ],
          lines: [
            {
              id: "l1",
              label: "Personal",
              category: "PERSONNEL",
              unit: "h",
              tariffId: t.id,
              plannedQuantity: "8",
              actualQuantity: null,
              costRate: "0",
              saleRate: "0",
            },
          ],
        })
        .expect(201)
    ).body;
    expect(service.status).toBe("INQUIRY");
    expect(service.calculations).toHaveLength(0);
    expect(service.costs.planned).toMatchObject({
      cost: "100.00",
      revenue: "160.00",
      result: "60.00",
    });
    await agent
      .put(`/services/tariffs/${t.id}`)
      .send({ ...t, version: t.version, costRate: "30", saleRate: "60" })
      .expect(200);
    service = (
      await agent
        .put(`/services/${service.id}`)
        .send({
          version: service.version,
          description: "Eigener Auftrag für DRK",
        })
        .expect(200)
    ).body;
    expect(service.lines[0].costRate).toBe("12.5");
    await agent
      .put(`/services/${service.id}`)
      .send({ version: 0, description: "Veraltete Änderung" })
      .expect(409);
    service = (
      await agent
        .post(`/services/${service.id}/transition`)
        .send({ version: service.version, status: "PLANNING" })
        .expect(201)
    ).body;
    const second = (
      await agent
        .post("/services")
        .send({
          ...base,
          title: "Zeitgleicher Dienst",
          reservations: [
            {
              id: "r2",
              kind: "VEHICLE",
              resourceId: v.id,
              startsAt: base.startsAt,
              endsAt: base.endsAt,
            },
          ],
        })
        .expect(201)
    ).body;
    await agent
      .post(`/services/${second.id}/transition`)
      .send({ version: second.version, status: "PLANNING" })
      .expect(201);
    service = (await agent.get(`/services/${service.id}`).expect(200)).body;
    expect(service.warnings.map((w: { code: string }) => w.code)).toContain(
      "RESOURCE_CONFLICT",
    );
    await agent
      .post(`/services/${service.id}/transition`)
      .send({ version: service.version, status: "RELEASED" })
      .expect(400);
    service = (
      await agent
        .post(`/services/${service.id}/transition`)
        .send({
          version: service.version,
          status: "RELEASED",
          reason: "Fahrzeugwechsel mit Planer abgestimmt",
        })
        .expect(201)
    ).body;
    expect(service.releases[0].warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "RESOURCE_CONFLICT" }),
      ]),
    );
    const upload = await agent
      .post(`/services/${service.id}/documents`)
      .field("version", String(service.version))
      .attach("file", Buffer.from("%PDF-1.7\n%%EOF"), {
        filename: "auftrag.pdf",
        contentType: "application/pdf",
      })
      .expect(201);
    expect(upload.body).not.toHaveProperty("storageKey");
    await agent
      .get(`/services/${second.id}/documents/${upload.body.id}`)
      .expect(404);
    await agent
      .get(`/services/${service.id}/documents/${upload.body.id}`)
      .expect(200)
      .expect("Content-Type", /pdf/);
    service = (await agent.get(`/services/${service.id}`).expect(200)).body;
    service = (
      await agent
        .put(`/services/${service.id}`)
        .send({
          version: service.version,
          positions: [{ ...service.positions[0], quantity: 2 }],
        })
        .expect(200)
    ).body;
    expect(service.status).toBe("PLANNING");
    service = (
      await agent
        .post(`/services/${service.id}/transition`)
        .send({
          version: service.version,
          status: "RELEASED",
          reason: "Auftraggeber über Abweichung informiert",
        })
        .expect(201)
    ).body;
    for (const status of ["ACTIVE", "REVIEW"])
      service = (
        await agent
          .post(`/services/${service.id}/transition`)
          .send({ version: service.version, status })
          .expect(201)
      ).body;
    service = (
      await agent
        .put(`/services/${service.id}`)
        .send({
          version: service.version,
          assignments: [
            {
              ...service.assignments[0],
              actualStartsAt: base.startsAt,
              actualEndsAt: base.endsAt,
              actualBreakMinutes: 30,
            },
          ],
          outcome: {
            visitors: 1000,
            treatments: 0,
            transports: 0,
            emergencyPhysicians: 0,
            conditions: "Trocken",
          },
          lines: [{ ...service.lines[0], actualQuantity: "7.5" }],
        })
        .expect(200)
    ).body;
    expect(service.status).toBe("REVIEW");
    service = (
      await agent
        .post(`/services/${service.id}/transition`)
        .send({ version: service.version, status: "COMPLETED" })
        .expect(201)
    ).body;
    await agent
      .put(`/services/${service.id}`)
      .send({ version: service.version, title: "Nicht erlaubt" })
      .expect(400);
    await agent
      .post(`/services/${service.id}/transition`)
      .send({ version: service.version, status: "REVIEW" })
      .expect(400);
    service = (
      await agent
        .post(`/services/${service.id}/transition`)
        .send({
          version: service.version,
          status: "REVIEW",
          reason: "Nachtrag Fahrtkosten",
        })
        .expect(201)
    ).body;
    expect(service.status).toBe("REVIEW");
    const stats = (
      await agent
        .get(
          "/services/statistics?from=2026-11-01&to=2026-11-01&customer=Sportverein",
        )
        .expect(200)
    ).body;
    expect(
      stats.rows.find((r: { id: string }) => r.id === service.id),
    ).toMatchObject({
      plannedMinutes: 480,
      actualMinutes: 450,
      forecastComparable: false,
      outcome: { treatments: 0 },
    });
    const csv = await agent
      .get("/services/statistics.csv")
      .expect(200)
      .expect("Content-Type", /csv/);
    expect(csv.text).toContain("Stadtlauf");
    expect(
      (await agent.get("/services?from=2027-01-01").expect(200)).body,
    ).toHaveLength(0);
  });
  it("shares MPG identities and restricts services and documents independently", async () => {
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
    await request(app.getHttpServer()).get("/services").expect(401);
    await warehouse.get("/services").expect(403);
    const mpg = (
      await admin
        .post("/mpg/people")
        .send({ name: "Gemeinsame Person", birthDate: "1990-01-01" })
        .expect(201)
    ).body;
    const catalog = (await admin.get("/services/catalog").expect(200)).body;
    const shared = catalog.people.find(
      (row: { id: string }) => row.id === mpg.personId,
    );
    expect(shared).toBeTruthy();
    expect(shared).not.toHaveProperty("birthDate");
    expect(shared).not.toHaveProperty("instructorAuthorized");
    await admin
      .put(`/services/people/${shared.id}`)
      .send({
        ...shared,
        name: "Neuer gemeinsamer Name",
        version: shared.version,
      })
      .expect(200);
    expect(
      (await admin.get("/mpg/people").expect(200)).body.find(
        (row: { id: string }) => row.id === mpg.id,
      ).name,
    ).toBe("Neuer gemeinsamer Name");
    const db = app.get(PrismaService),
      user = await db.user.findUniqueOrThrow({
        where: { email: "lager@rescuebase.local" },
      });
    await db.user.update({
      where: { id: user.id },
      data: { servicesManage: true },
    });
    await warehouse.get("/services").expect(200);
    await warehouse.get("/mpg/people").expect(403);
    await db.user.update({
      where: { id: user.id },
      data: { servicesManage: false },
    });
    await warehouse.get("/services/catalog").expect(403);
  });
  it("persists complete and incomplete method versions without fabricated defaults", async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post("/auth/login")
      .send({ email: "admin@rescuebase.local", password: "rescuebase-admin" })
      .expect(201);
    let service = (
      await agent
        .post("/services")
        .send({ ...base, title: "Eigene Veranstaltung", supportOnly: false })
        .expect(201)
    ).body;
    service = (
      await agent
        .post(`/services/${service.id}/calculations`)
        .send({ version: service.version, method: "MAURER", input: {} })
        .expect(201)
    ).body;
    expect(service.calculations[0].result.status).toBe("INCOMPLETE");
    service = (
      await agent
        .post(`/services/${service.id}/calculations`)
        .send({
          version: service.version,
          method: "MAURER",
          reason: "Besucherzahlen bestätigt",
          input: {
            capacity: 500,
            expectedVisitors: 500,
            indoor: false,
            eventFactor: 1,
            protectedVipCount: 0,
            policeViolenceRisk: false,
          },
        })
        .expect(201)
    ).body;
    expect(service.calculations).toHaveLength(2);
    expect(service.calculations[0].result.status).toBe("COMPLETE");
    service = (
      await agent
        .post(`/services/${service.id}/calculations`)
        .send({
          version: service.version,
          method: "COLOGNE",
          reason: "Räumliche Planung ergänzt",
          input: {},
        })
        .expect(201)
    ).body;
    expect(service.calculations[0].result.status).toBe("INCOMPLETE");
    expect(service.calculations[0].methodVersion).toBeTruthy();
  });
});
