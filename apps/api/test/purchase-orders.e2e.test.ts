import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
// @ts-expect-error supertest ships export= typings; default import is correct with ts-jest runtime.
import request from "supertest";
import { bootstrapTestApp } from "./bootstrap-test-app.js";

jest.setTimeout(30_000);

describe("purchase orders", () => {
  let app: INestApplication;
  let closeApp: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const harness = await bootstrapTestApp({
      databaseName: "rescuebase_purchase_orders_test",
    });
    app = harness.app;
    closeApp = harness.close;
  });

  afterAll(async () => {
    await closeApp?.();
  });

  it("creates a manual draft with article snapshots and gross totals", async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post("/auth/login")
      .send({ email: "lager@rescuebase.local", password: "rescuebase-lager" })
      .expect(201);

    const created = await agent
      .post("/purchase-orders")
      .send({
        supplierName: "MediSafe Einkauf",
        locationId: "loc-main",
        notes: "Bitte gesammelt liefern.",
        lines: [
          {
            articleId: "article-bandage",
            orderedQuantity: 4,
            note: "Kartonweise möglich",
          },
        ],
      })
      .expect(201);

    expect(created.body).toMatchObject({
      supplierName: "MediSafe Einkauf",
      locationId: "loc-main",
      status: "DRAFT",
      totalGrossCents: 996,
      lines: [
        expect.objectContaining({
          articleId: "article-bandage",
          articleName: "Verbandpäckchen mittel",
          articleUrl:
            "https://shop.example.org/articles/verbandpaeckchen-mittel",
          grossUnitPriceCents: 249,
          orderedQuantity: 4,
          receivedQuantity: 0,
          lineTotalGrossCents: 996,
        }),
      ],
    });
  });

  it("requires admin approval before ordering and limits edits afterwards", async () => {
    const warehouse = request.agent(app.getHttpServer());
    const admin = request.agent(app.getHttpServer());
    await warehouse
      .post("/auth/login")
      .send({ email: "lager@rescuebase.local", password: "rescuebase-lager" })
      .expect(201);
    await admin
      .post("/auth/login")
      .send({ email: "admin@rescuebase.local", password: "rescuebase-admin" })
      .expect(201);

    const created = await warehouse
      .post("/purchase-orders")
      .send({
        supplierName: "Rescue Tech",
        locationId: "loc-main",
        lines: [{ articleId: "article-tourniquet", orderedQuantity: 2 }],
      })
      .expect(201);

    await warehouse
      .post(`/purchase-orders/${created.body.id}/approve`)
      .expect(403);
    await warehouse
      .post(`/purchase-orders/${created.body.id}/order`)
      .expect(400);
    const approved = await admin
      .post(`/purchase-orders/${created.body.id}/approve`)
      .expect(201);
    expect(approved.body).toMatchObject({
      status: "APPROVED",
      approvedByName: "Admin",
      approvedAt: expect.any(String),
    });

    await warehouse
      .patch(`/purchase-orders/${created.body.id}`)
      .send({
        lines: [{ articleId: "article-tourniquet", orderedQuantity: 3 }],
      })
      .expect(400);

    const annotated = await warehouse
      .patch(`/purchase-orders/${created.body.id}`)
      .send({
        supplierName: "Rescue Tech GmbH",
        notes: "Freigegeben, telefonisch angekündigt.",
        lineNotes: [
          { lineId: approved.body.lines[0].id, note: "Priorität hoch" },
        ],
      })
      .expect(200);
    expect(annotated.body).toMatchObject({
      supplierName: "Rescue Tech GmbH",
      notes: "Freigegeben, telefonisch angekündigt.",
      lines: [
        expect.objectContaining({ note: "Priorität hoch", orderedQuantity: 2 }),
      ],
    });
  });

  it("creates purchase orders from shortages with supplier grouping", async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post("/auth/login")
      .send({ email: "admin@rescuebase.local", password: "rescuebase-admin" })
      .expect(201);
    await agent
      .put("/inventory/targets/article-bandage/loc-main")
      .send({ targetQuantity: 131 })
      .expect(200);
    await agent
      .put("/inventory/targets/article-tourniquet/loc-main")
      .send({ targetQuantity: 20 })
      .expect(200);

    const created = await agent
      .post("/purchase-orders/from-shortages")
      .send({
        locationId: "loc-main",
        groupingMode: "supplier",
        articleIds: ["article-bandage", "article-tourniquet"],
      })
      .expect(201);

    expect(created.body).toHaveLength(2);
    expect(created.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          supplierName: "MediSafe Einkauf",
          lines: [
            expect.objectContaining({
              articleId: "article-bandage",
              orderedQuantity: 20,
            }),
          ],
        }),
        expect.objectContaining({
          supplierName: "Rescue Tech",
          lines: [
            expect.objectContaining({
              articleId: "article-tourniquet",
              orderedQuantity: 2,
            }),
          ],
        }),
      ]),
    );
  });

  it("receives ordered purchase-order lines into inventory batches", async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post("/auth/login")
      .send({ email: "admin@rescuebase.local", password: "rescuebase-admin" })
      .expect(201);
    const created = await agent
      .post("/purchase-orders")
      .send({
        supplierName: "SafeHands",
        locationId: "loc-main",
        lines: [{ articleId: "article-gloves", orderedQuantity: 10 }],
      })
      .expect(201);
    const approved = await agent
      .post(`/purchase-orders/${created.body.id}/approve`)
      .expect(201);
    await agent.post(`/purchase-orders/${created.body.id}/order`).expect(201);

    const partial = await agent
      .post(`/purchase-orders/${created.body.id}/receive`)
      .send({
        lines: [
          {
            lineId: approved.body.lines[0].id,
            batches: [
              { lotNumber: "GL-2030-A", expiresAt: "2030-01-31", quantity: 4 },
            ],
          },
        ],
      })
      .expect(201);
    expect(partial.body).toMatchObject({
      status: "PARTIALLY_RECEIVED",
      lines: [expect.objectContaining({ receivedQuantity: 4 })],
    });

    await agent
      .post(`/purchase-orders/${created.body.id}/receive`)
      .send({
        lines: [
          {
            lineId: approved.body.lines[0].id,
            batches: [
              { lotNumber: "GL-2030-B", expiresAt: "2030-02-28", quantity: 7 },
            ],
          },
        ],
      })
      .expect(400);

    const received = await agent
      .post(`/purchase-orders/${created.body.id}/receive`)
      .send({
        lines: [
          {
            lineId: approved.body.lines[0].id,
            batches: [
              { lotNumber: "GL-2030-B", expiresAt: "2030-02-28", quantity: 6 },
            ],
          },
        ],
      })
      .expect(201);
    expect(received.body).toMatchObject({
      status: "RECEIVED",
      lines: [expect.objectContaining({ receivedQuantity: 10 })],
    });

    const batches = await agent.get("/inventory/batches").expect(200);
    expect(batches.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          articleId: "article-gloves",
          locationId: "loc-main",
          lotNumber: "GL-2030-A",
          quantity: 4,
        }),
        expect.objectContaining({
          articleId: "article-gloves",
          locationId: "loc-main",
          lotNumber: "GL-2030-B",
          quantity: 6,
        }),
      ]),
    );
  });

  it("renders a purchase-order PDF with optional line notes", async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post("/auth/login")
      .send({ email: "admin@rescuebase.local", password: "rescuebase-admin" })
      .expect(201);
    const created = await agent
      .post("/purchase-orders")
      .send({
        supplierName: "MediSafe Einkauf",
        locationId: "loc-main",
        lines: [
          {
            articleId: "article-bandage",
            orderedQuantity: 1,
            note: "Bitte steril verpackt liefern.",
          },
        ],
      })
      .expect(201);

    await agent
      .get(
        `/reports/purchase-orders/${created.body.id}.pdf?includeLineNotes=true`,
      )
      .expect("cache-control", "no-store, max-age=0")
      .expect("content-type", /application\/pdf/)
      .expect(200);
  });

  it("archives purchase orders without removing access and restores them again", async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post("/auth/login")
      .send({ email: "admin@rescuebase.local", password: "rescuebase-admin" })
      .expect(201);
    const created = await agent
      .post("/purchase-orders")
      .send({
        supplierName: "Archiv Test",
        locationId: "loc-main",
        lines: [{ articleId: "article-bandage", orderedQuantity: 1 }],
      })
      .expect(201);

    const archived = await agent
      .post(`/purchase-orders/${created.body.id}/archive`)
      .expect(201);
    expect(archived.body).toMatchObject({
      id: created.body.id,
      archivedAt: expect.any(String),
    });

    await agent
      .get(`/purchase-orders/${created.body.id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.archivedAt).toEqual(expect.any(String));
      });

    await agent
      .get("/purchase-orders")
      .expect(200)
      .expect(({ body }) => {
        const order = body.find(
          (entry: { id: string }) => entry.id === created.body.id,
        );
        expect(order).toMatchObject({ archivedAt: expect.any(String) });
      });

    const restored = await agent
      .post(`/purchase-orders/${created.body.id}/restore`)
      .expect(201);
    expect(restored.body).toMatchObject({ id: created.body.id });
    expect(restored.body).not.toHaveProperty("archivedAt");
  });
});
