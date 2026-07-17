import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
import { inflateSync } from "node:zlib";
// @ts-expect-error supertest ships export= typings; default import is correct with ts-jest runtime.
import request from "supertest";
import { bootstrapTestApp } from "./bootstrap-test-app.js";
import { MailService } from "../src/services/mail.service.js";

jest.setTimeout(30_000);

function extractPdfMediaBox(pdf: Buffer) {
  const match = pdf.toString("latin1").match(/\/MediaBox\s*\[\s*0\s+0\s+([0-9.]+)\s+([0-9.]+)\s*\]/);
  if (!match) {
    throw new Error("MediaBox not found in PDF output.");
  }
  return { width: Number(match[1]), height: Number(match[2]) };
}

function inflatePdfStreams(pdf: Buffer) {
  const content = pdf.toString("latin1");
  const decoded: string[] = [];
  let cursor = 0;
  while (cursor < content.length) {
    const filterIndex = content.indexOf("/Filter /FlateDecode", cursor);
    if (filterIndex === -1) {
      break;
    }
    const streamIndex = content.indexOf("stream", filterIndex);
    const endStreamIndex = content.indexOf("endstream", streamIndex);
    if (streamIndex === -1 || endStreamIndex === -1) {
      break;
    }
    let dataStart = streamIndex + 6;
    if (pdf[dataStart] === 0x0d && pdf[dataStart + 1] === 0x0a) dataStart += 2;
    else if (pdf[dataStart] === 0x0a) dataStart += 1;
    const dataEnd = pdf[endStreamIndex - 1] === 0x0d && pdf[endStreamIndex - 2] !== 0x0a ? endStreamIndex - 1 : endStreamIndex;
    try {
      decoded.push(inflateSync(pdf.subarray(dataStart, dataEnd)).toString("utf8"));
    } catch {
      // Ignore non-content streams.
    }
    cursor = endStreamIndex + 9;
  }
  return decoded.join("\n");
}

function extractVisiblePdfText(pdf: Buffer) {
  return inflatePdfStreams(pdf)
    .split(/\r?\n/)
    .flatMap((line) => {
      const hexMatches = [...line.matchAll(/<([0-9A-Fa-f]+)>/g)].map((match) =>
        Buffer.from(match[1] ?? "", "hex").toString("latin1")
      );
      const literalMatches = [...line.matchAll(/\(([^()]*)\)/g)].map((match) => match[1] ?? "");
      return [...hexMatches, ...literalMatches];
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

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
    const mailService = app.get(MailService);
    const sendSpy = jest.spyOn(mailService, "sendNewOrderNotification").mockResolvedValue({});
    await agent
      .post("/auth/login")
      .send({ email: "admin@rescuebase.local", password: "rescuebase-admin" })
      .expect(201);
    await agent.post("/auth/preferences/order-notifications").send({ enabled: true }).expect(201);
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
    expect(sendSpy).toHaveBeenCalledWith(
      "admin@rescuebase.local",
      expect.objectContaining({ kitName: "Rucksack Fahrzeug 1" }),
      expect.any(String)
    );

    const checks = await agent.get("/checks?q=Mara&status=CONDITIONAL").expect(200);
    expect(checks.body.items).toEqual([
      expect.objectContaining({
        id: completed.body.check.id,
        checkerName: "Mara Müller",
        effectiveStatus: "CONDITIONAL",
        deviationCount: 1,
        kit: expect.objectContaining({ name: "Rucksack Fahrzeug 1" })
      })
    ]);
    expect(checks.body).toEqual(expect.objectContaining({ page: 1, pageSize: 25, total: 1 }));

    const checkDetail = await agent.get(`/checks/${completed.body.check.id}`).expect(200);
    expect(checkDetail.body).toEqual(expect.objectContaining({
      signaturePngDataUrl: "data:image/png;base64,abc",
      replenishmentOrder: expect.objectContaining({ id: completed.body.replenishmentOrder.id }),
      positions: expect.arrayContaining([
        expect.objectContaining({ articleName: "Verbandpäckchen mittel", missingQuantity: 1, discardedExpiredQuantity: 1 })
      ])
    }));

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
    expect(partial.body.order.status).toBe("OPEN");

    const afterInventory = await agent.get("/inventory/batches").expect(200);
    const bandageAfter = afterInventory.body.find((batch: { id: string }) => batch.id === "batch-bandage-1");
    expect(bandageAfter.quantity).toBe(119);

    const audit = await agent.get(`/audit?entityId=${orderId}`).expect(200);
    expect(audit.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "REPLENISHMENT_FULFILLED", entityType: "ReplenishmentOrder" })
      ])
    );

    await agent.get("/reports/csv/inventory").expect(404);
    await agent.get("/reports/csv/replenishment").expect(404);

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

  it("rejects cancelling completed replenishment orders", async () => {
    const server = app.getHttpServer();
    const agent = request.agent(server);
    await agent
      .post("/auth/login")
      .send({ email: "admin@rescuebase.local", password: "rescuebase-admin" })
      .expect(201);

    await agent
      .post("/replenishment-orders/order-1001/fulfill")
      .send({
        items: [
          { itemId: "pos-bandage", batchId: "batch-bandage-1", quantity: 3 },
          { itemId: "pos-tourniquet", batchId: "batch-tourniquet-1", quantity: 1 }
        ]
      })
      .expect(201);

    await agent
      .post("/replenishment-orders/order-1001/cancel")
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
        manufacturer: "MediSafe",
        manufacturerPartNumber: "VB-2000",
        category: "Verbandmaterial",
        barcode: "040000000099",
        articleUrl: "https://shop.example.org/articles/verbandpaeckchen-gross",
        sterile: true,
        medicalDevice: true,
        stkRequired: true,
        stkIntervalMonths: 12,
        mtkRequired: false,
        storageNotes: "Trocken lagern",
        notes: "Nur originalverpackt einlagern",
        criticalDefault: true
      })
      .expect(200);

    const articles = await agent.get("/catalog/articles").expect(200);
    expect(articles.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "article-bandage",
          medicalDevice: true,
          stkRequired: true,
          stkIntervalMonths: 12,
          mtkRequired: false
        })
      ])
    );

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
          quantity: 2,
          metadata: expect.objectContaining({
            previous: expect.objectContaining({ quantity: 116, lotNumber: "VB-2026-04", expiresAt: "2027-04-30" }),
            next: expect.objectContaining({ quantity: 118, lotNumber: "VB-2026-04A", expiresAt: "2027-05-15" })
          })
        })
      ])
    );

    await agent
      .get("/reports/qr-label/kit-rucksack-1.pdf?format=a4")
      .expect("content-type", /application\/pdf/)
      .expect(200);

    const labelPdf = await agent
      .get("/reports/qr-label/kit-rucksack-1.pdf?format=label")
      .buffer()
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      })
      .expect("content-type", /application\/pdf/)
      .expect(200);

    const mediaBox = extractPdfMediaBox(labelPdf.body);
    expect(mediaBox.width).toBeCloseTo(175.75, 1);
    expect(mediaBox.height).toBeCloseTo(170.08, 1);

    const visibleText = extractVisiblePdfText(labelPdf.body);
    expect(visibleText).toContain("SAN-RS-001A");
    expect(visibleText).toContain("Rucksack Fahrzeug 1A");
    expect(visibleText).toContain("Zentrallager");
    expect(visibleText).toContain("Scan für Check");
    expect(visibleText).not.toContain("http://localhost:5173/check/");
    expect(visibleText).not.toContain("/check/SAN-RS-001-ZUGANG-2026");
  });

  it("rejects medical device articles without required STK or MTK intervals", async () => {
    const server = app.getHttpServer();
    const agent = request.agent(server);
    await agent.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);

    await agent
      .patch("/catalog/articles/article-bandage")
      .send({
        name: "Verbandpäckchen mittel",
        unit: "Stück",
        medicalDevice: true,
        stkRequired: true,
        mtkRequired: false,
        sterile: true,
        criticalDefault: false
      })
      .expect(400);
  });

  it("soft-deletes operational catalog records from normal reads", async () => {
    const server = app.getHttpServer();
    const agent = request.agent(server);
    await agent.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);

    const article = await agent.post("/catalog/articles").send({
      name: "Softdelete-Testartikel",
      unit: "Stück",
      sterile: false,
      medicalDevice: false,
      stkRequired: false,
      mtkRequired: false,
      criticalDefault: false
    }).expect(201);
    const location = await agent.post("/catalog/locations").send({ name: "Softdelete-Lager", kind: "ROOM" }).expect(201);
    const template = await agent.post("/catalog/templates").send({
      name: "Softdelete-Vorlage",
      positions: [{ articleId: article.body.id, requiredQuantity: 1, critical: false }]
    }).expect(201);
    const kit = await agent.post("/catalog/kits").send({
      name: "Softdelete-Rucksack",
      code: "SOFTDELETE-RS",
      locationId: location.body.id,
      templateId: template.body.id
    }).expect(201);
    const batch = await agent.post("/inventory/batches").send({
      articleId: article.body.id,
      locationId: location.body.id,
      lotNumber: "SOFT-1",
      expiresAt: "2028-01-31",
      quantity: 3
    }).expect(201);

    await request(server).get(`/public/kits/${kit.body.publicToken}`).expect(200);
    await agent.delete(`/inventory/batches/${batch.body.id}`).expect(200);
    await agent.delete(`/catalog/kits/${kit.body.id}`).expect(200);
    await agent.delete(`/catalog/templates/${template.body.id}`).expect(200);
    await agent.delete(`/catalog/locations/${location.body.id}`).expect(200);
    await agent.delete(`/catalog/articles/${article.body.id}`).expect(200);

    await request(server).get(`/public/kits/${kit.body.publicToken}`).expect(404);
    expect((await agent.get("/inventory/batches").expect(200)).body).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: batch.body.id })
    ]));
    expect((await agent.get("/catalog/kits").expect(200)).body).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: kit.body.id })
    ]));
    expect((await agent.get("/catalog/templates").expect(200)).body).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: template.body.id })
    ]));
    expect((await agent.get("/catalog/locations").expect(200)).body).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: location.body.id })
    ]));
    expect((await agent.get("/catalog/articles").expect(200)).body).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: article.body.id })
    ]));
  });
});
