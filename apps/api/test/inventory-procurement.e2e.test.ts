import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
import * as request from "supertest";
import { bootstrapTestApp } from "./bootstrap-test-app.js";

jest.setTimeout(30_000);

describe("inventory procurement", () => {
  let app: INestApplication;
  let closeApp: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const harness = await bootstrapTestApp({ databaseName: "rescuebase_procurement_test" });
    app = harness.app;
    closeApp = harness.close;
  });

  afterAll(async () => {
    await closeApp?.();
  });

  it("manages Soll targets and open procurement orders through reconciliation", async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);

    await agent
      .put("/inventory/targets/article-bandage/loc-main")
      .send({ targetQuantity: 150 })
      .expect(200);

    const reconciled = await agent.post("/inventory/targets/reconcile").expect(201);
    expect(reconciled.body).toMatchObject({ checked: 1, created: 1, updated: 0, cancelled: 0 });

    const orders = await agent.get("/inventory/procurement-orders").expect(200);
    expect(orders.body).toEqual([
      expect.objectContaining({
        articleId: "article-bandage",
        locationId: "loc-main",
        requestedQuantity: 30,
        receivedQuantity: 0,
        remainingQuantity: 30,
        status: "OPEN"
      })
    ]);

    await agent
      .post("/inventory/batches/batch-bandage-1/corrections")
      .send({ reason: "Inventur", quantity: 130 })
      .expect(201);
    const updated = await agent.post("/inventory/targets/reconcile").expect(201);
    expect(updated.body).toMatchObject({ checked: 1, created: 0, updated: 1, cancelled: 0 });
    const updatedOrders = await agent.get("/inventory/procurement-orders").expect(200);
    expect(updatedOrders.body[0]).toMatchObject({ requestedQuantity: 20, status: "OPEN" });

    await agent
      .post("/inventory/batches/batch-bandage-1/corrections")
      .send({ reason: "Lieferung außerhalb Auftrag", quantity: 155 })
      .expect(201);
    const cancelled = await agent.post("/inventory/targets/reconcile").expect(201);
    expect(cancelled.body).toMatchObject({ checked: 1, created: 0, updated: 0, cancelled: 1 });
    const cancelledOrders = await agent.get("/inventory/procurement-orders").expect(200);
    expect(cancelledOrders.body[0]).toMatchObject({ requestedQuantity: 20, status: "CANCELLED" });
  });

  it("ignores expired stock and freezes in-progress procurement quantities", async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);
    const article = await agent.post("/catalog/articles").send({
      name: "Procurement-Testartikel",
      unit: "Stück",
      sterile: false,
      medicalDevice: false,
      stkRequired: false,
      mtkRequired: false,
      criticalDefault: false
    }).expect(201);

    await agent.post("/inventory/batches").send({
      articleId: article.body.id,
      locationId: "loc-main",
      lotNumber: "ALT-2020",
      expiresAt: "2020-01-01",
      quantity: 10
    }).expect(201);
    await agent.put(`/inventory/targets/${article.body.id}/loc-main`).send({ targetQuantity: 10 }).expect(200);
    await agent.post("/inventory/targets/reconcile").expect(201);
    const orders = await agent.get("/inventory/procurement-orders").expect(200);
    const order = orders.body.find((entry: { articleId: string }) => entry.articleId === article.body.id);
    expect(order).toMatchObject({ requestedQuantity: 10, status: "OPEN" });

    await agent.post(`/inventory/procurement-orders/${order.id}/start`).expect(201);
    await agent.post("/inventory/batches").send({
      articleId: article.body.id,
      locationId: "loc-main",
      lotNumber: "NEU-2028",
      expiresAt: "2028-01-01",
      quantity: 8
    }).expect(201);
    await agent.post("/inventory/targets/reconcile").expect(201);
    const frozenOrders = await agent.get("/inventory/procurement-orders").expect(200);
    expect(frozenOrders.body.find((entry: { id: string }) => entry.id === order.id)).toMatchObject({
      requestedQuantity: 10,
      status: "IN_PROGRESS"
    });
  });

  it("receives procurement orders into real batches and closes only after full receipt", async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);
    await agent.put("/inventory/targets/article-tourniquet/loc-main").send({ targetQuantity: 25 }).expect(200);
    await agent.post("/inventory/targets/reconcile").expect(201);
    const orders = await agent.get("/inventory/procurement-orders").expect(200);
    const order = orders.body.find((entry: { articleId: string }) => entry.articleId === "article-tourniquet");

    await agent.post(`/inventory/procurement-orders/${order.id}/start`).expect(201);
    await agent.post(`/inventory/procurement-orders/${order.id}/receive`).send({
      verified: false,
      items: [{ lotNumber: "TQ-2030-A", expiresAt: "2030-01-31", quantity: 1 }]
    }).expect(400);
    const partial = await agent.post(`/inventory/procurement-orders/${order.id}/receive`).send({
      verified: true,
      items: [{ lotNumber: "TQ-2030-A", expiresAt: "2030-01-31", quantity: 3 }]
    }).expect(201);
    expect(partial.body).toMatchObject({ receivedQuantity: 3, remainingQuantity: 4, status: "IN_PROGRESS" });
    expect(partial.body.receipts[0]).toEqual(expect.objectContaining({ verifiedBy: "Lagerteam", verifiedAt: expect.any(String) }));

    await agent.post(`/inventory/procurement-orders/${order.id}/receive`).send({
      verified: true,
      items: [{ lotNumber: "TQ-2030-B", expiresAt: "2030-02-28", quantity: 5 }]
    }).expect(400);

    const done = await agent.post(`/inventory/procurement-orders/${order.id}/receive`).send({
      verified: true,
      items: [{ lotNumber: "TQ-2030-B", expiresAt: "2030-02-28", quantity: 4 }]
    }).expect(201);
    expect(done.body).toMatchObject({ receivedQuantity: 7, remainingQuantity: 0, status: "DONE" });

    const batches = await agent.get("/inventory/batches").expect(200);
    expect(batches.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ articleId: "article-tourniquet", locationId: "loc-main", lotNumber: "TQ-2030-A", quantity: 3 }),
      expect.objectContaining({ articleId: "article-tourniquet", locationId: "loc-main", lotNumber: "TQ-2030-B", quantity: 4 })
    ]));
  });

  it("stores the admin-configurable reconciliation time", async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);

    const initial = await agent.get("/inventory/automation-config").expect(200);
    expect(initial.body.dailyReconcileTime).toBe("02:00");
    await agent.post("/inventory/automation-config").send({ dailyReconcileTime: "06:30" }).expect(201);
    const updated = await agent.get("/inventory/automation-config").expect(200);
    expect(updated.body.dailyReconcileTime).toBe("06:30");
  });

  it("renders a procurement PDF with current procurement needs", async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);
    await agent.put("/inventory/targets/article-bandage/loc-main").send({ targetQuantity: 150 }).expect(200);
    await agent.post("/inventory/targets/reconcile").expect(201);

    await agent
      .get("/reports/procurement.pdf?q=Verband")
      .expect("cache-control", "no-store, max-age=0")
      .expect("content-type", /application\/pdf/)
      .expect(200);
  });
});
