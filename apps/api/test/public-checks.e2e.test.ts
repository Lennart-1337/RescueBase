import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
import request from "supertest";
import { bootstrapTestApp } from "./bootstrap-test-app.js";

jest.setTimeout(30_000);

describe("public check flow", () => {
  let app: INestApplication;
  let closeApp: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const harness = await bootstrapTestApp({ databaseName: "rescuebase_test" });
    app = harness.app;
    closeApp = harness.close;
  });

  afterAll(async () => {
    await closeApp?.();
  });

  it("creates a replenishment order, books a partial batch fulfillment and exposes audit plus reports", async () => {
    const server = app.getHttpServer();
    const agent = request.agent(server);
    await agent
      .post("/auth/login")
      .send({ email: "admin@rescuebase.local", password: "rescuebase-admin" })
      .expect(201);
    const publicKit = await request(server).get("/public/kits/SAN-RS-001-ZUGANG-2026").expect(200);

    expect(publicKit.body.kit.name).toBe("Rucksack Fahrzeug 1");
    expect(publicKit.body.template.positions).toHaveLength(3);

    const completed = await request(server)
      .post("/public/kits/SAN-RS-001-ZUGANG-2026/checks")
      .send({
        checkerName: "Mara Müller",
        signaturePngDataUrl: "data:image/png;base64,abc",
        positions: [
          { templatePositionId: "pos-bandage", countedQuantity: 5, discardedExpiredQuantity: 1 },
          { templatePositionId: "pos-tourniquet", countedQuantity: 2, discardedExpiredQuantity: 0 },
          { templatePositionId: "pos-gloves", countedQuantity: 8, discardedExpiredQuantity: 0 }
        ]
      })
      .expect(201);

    expect(completed.body.check.effectiveStatus).toBe("CONDITIONAL");
    expect(completed.body.replenishmentOrder.items).toEqual([
      expect.objectContaining({ articleName: "Verbandpäckchen mittel", requestedQuantity: 2 })
    ]);

    const orderId = completed.body.replenishmentOrder.id as string;
    const beforeInventory = await agent.get("/inventory/batches").expect(200);
    const bandageBefore = beforeInventory.body.find((batch: { id: string }) => batch.id === "batch-bandage-1");
    expect(bandageBefore.quantity).toBe(120);

    const partial = await agent
      .post(`/replenishment-orders/${orderId}/fulfill`)
      .send({
        items: [{ itemId: "pos-bandage", batchId: "batch-bandage-1", quantity: 1 }]
      })
      .expect(201);

    expect(partial.body.completed).toBe(false);
    expect(partial.body.remainingQuantity).toBe(1);
    expect(partial.body.order.status).toBe("IN_PROGRESS");

    const afterInventory = await agent.get("/inventory/batches").expect(200);
    const bandageAfter = afterInventory.body.find((batch: { id: string }) => batch.id === "batch-bandage-1");
    expect(bandageAfter.quantity).toBe(119);

    const audit = await agent.get(`/audit?entityId=${orderId}`).expect(200);
    expect(audit.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "REPLENISHMENT_FULFILLED", entityType: "ReplenishmentOrder" })
      ])
    );

    const inventoryCsv = await agent.get("/reports/csv/inventory").expect(200);
    expect(inventoryCsv.text).toContain('"Verbandpäckchen mittel","Hauptlager","VB-2026-04","2027-04-30","119"');

    await agent
      .get(`/reports/replenishment/${orderId}.pdf`)
      .expect("content-type", /application\/pdf/)
      .expect(200);
  });

  it("rejects overbooking a charge", async () => {
    const server = app.getHttpServer();
    const agent = request.agent(server);
    await agent
      .post("/auth/login")
      .send({ email: "admin@rescuebase.local", password: "rescuebase-admin" })
      .expect(201);
    await agent
      .post("/replenishment-orders/order-1001/fulfill")
      .send({
        items: [{ itemId: "pos-tourniquet", batchId: "batch-tourniquet-1", quantity: 2 }]
      })
      .expect(400);
  });

  it("updates master data, revises templates, corrects batches, and renders both QR PDF formats", async () => {
    const server = app.getHttpServer();
    const agent = request.agent(server);
    await agent
      .post("/auth/login")
      .send({ email: "admin@rescuebase.local", password: "rescuebase-admin" })
      .expect(201);

    await agent
      .patch("/catalog/articles/article-bandage")
      .send({
        name: "Verbandpäckchen groß",
        unit: "Stück",
        barcode: "040000000099",
        criticalDefault: true
      })
      .expect(200);

    await agent
      .patch("/catalog/locations/loc-main")
      .send({ name: "Zentrallager", kind: "STORAGE" })
      .expect(200);

    const revisedTemplate = await agent
      .post("/catalog/templates/template-san-a-v1/revise")
      .send({
        positions: [
          { articleId: "article-bandage", requiredQuantity: 7, moduleName: "Verband", critical: true },
          { articleId: "article-gloves", requiredQuantity: 8, critical: false },
          { articleId: "article-tourniquet", requiredQuantity: 2, moduleName: "Blutung", critical: true }
        ]
      })
      .expect(201);
    expect(revisedTemplate.body.version).toBe(2);

    await agent
      .patch("/catalog/kits/kit-rucksack-1")
      .send({
        name: "Rucksack Fahrzeug 1A",
        code: "SAN-RS-001A",
        locationId: "loc-main",
        templateId: revisedTemplate.body.id
      })
      .expect(200);

    await agent
      .post("/inventory/batches/batch-bandage-1/corrections")
      .send({
        reason: "Inventur und Umzug",
        quantity: 118,
        lotNumber: "VB-2026-04A",
        expiresAt: "2027-05-15",
        locationId: "loc-main"
      })
      .expect(201);

    const movements = await agent.get("/inventory/batches/batch-bandage-1/movements").expect(200);
    expect(movements.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "BATCH_CORRECTION",
          reason: "Inventur und Umzug",
          quantity: -1
        })
      ])
    );

    await agent
      .get("/reports/qr-label/kit-rucksack-1.pdf?format=a4")
      .expect("content-type", /application\/pdf/)
      .expect(200);

    await agent
      .get("/reports/qr-label/kit-rucksack-1.pdf?format=label")
      .expect("content-type", /application\/pdf/)
      .expect(200);
  });
});
