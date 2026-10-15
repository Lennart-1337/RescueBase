import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
// @ts-expect-error supertest ships export= typings; default import is correct with ts-jest runtime.
import request from "supertest";
import { bootstrapTestApp } from "./bootstrap-test-app.js";
import { PrismaService } from "../src/persistence/prisma.service.js";
import { AuditService } from "../src/services/audit.service.js";

jest.setTimeout(30_000);
describe("bulk inventory target save", () => {
  let app: INestApplication;
  let close: (() => Promise<void>) | undefined;
  let agent: ReturnType<typeof request.agent>;
  let prisma: PrismaService;
  beforeAll(async () => {
    const harness = await bootstrapTestApp({ databaseName: "rescuebase_bulk_targets_test" });
    app = harness.app;
    close = harness.close;
    prisma = app.get(PrismaService);
    agent = request.agent(app.getHttpServer());
    await agent.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);
  });
  afterAll(async () => { await close?.(); });
  const save = (changes: object[]) => agent.put("/inventory/targets/bulk").send({ locationId: "loc-main", changes });
  const change = (articleId: string, targetQuantity: number, expectedTargetQuantity: number | null) => ({ articleId, targetQuantity, expectedTargetQuantity });
  async function createArticle(name: string) {
    const response = await agent.post("/catalog/articles").send({ name, unit: "Stück", sterile: false,
      medicalDevice: false, stkRequired: false, mtkRequired: false, criticalDefault: false }).expect(201);
    return response.body.id as string;
  }
  it("saves a batch with audit events and rejects the whole stale batch", async () => {
    const first = await createArticle("Bulk first");
    const second = await createArticle("Bulk second");
    const created = await save([change(first, 12, null), change(second, 7, null)]).expect(200);
    expect(created.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ articleId: first, targetQuantity: 12 }), expect.objectContaining({ articleId: second, targetQuantity: 7 })
    ]));
    const audits = await prisma.auditEvent.count({ where: { entityId: { in: [`${first}:loc-main`, `${second}:loc-main`] } } });
    expect(audits).toBe(2);
    await save([change(first, 99, 12), change(second, 5, 6)]).expect(409);
    const targets = await agent.get("/inventory/targets").expect(200);
    expect(targets.body.find((target: { articleId: string }) => target.articleId === first).targetQuantity).toBe(12);
    expect(await prisma.auditEvent.count({ where: { entityId: `${first}:loc-main` } })).toBe(1);
    await save([change(first, 2.5, 12)]).expect(400);
    await save([change(first, 2, 12), change(first, 3, 12)]).expect(400);
    await save([change(first, 2, 12), change("missing-article", 3, null)]).expect(400);
  });
  it("rolls back earlier writes and audit rows if a later audit fails", async () => {
    const first = await createArticle("Bulk rollback first");
    const second = await createArticle("Bulk rollback second");
    const audit = app.get(AuditService);
    const original = audit.recordInTransaction.bind(audit);
    let calls = 0;
    const spy = jest.spyOn(audit, "recordInTransaction").mockImplementation(async (...args) => {
      if (++calls === 2) throw new Error("Simulated audit storage failure");
      return original(...args);
    });
    try { await save([change(first, 12, null), change(second, 7, null)]).expect(500); }
    finally { spy.mockRestore(); }
    expect(await prisma.inventoryTarget.count({ where: { articleId: { in: [first, second] } } })).toBe(0);
    expect(await prisma.auditEvent.count({ where: { entityId: { in: [`${first}:loc-main`, `${second}:loc-main`] } } })).toBe(0);
  });
  it("removes minimums while cancelling only open procurement orders", async () => {
    const first = await createArticle("Bulk open order");
    const second = await createArticle("Bulk in-progress order");
    await save([change(first, 12, null), change(second, 7, null)]).expect(200);
    await agent.post("/inventory/targets/reconcile").expect(201);
    const orders = await agent.get("/inventory/procurement-orders").expect(200);
    const open = orders.body.find((order: { articleId: string }) => order.articleId === first);
    const progress = orders.body.find((order: { articleId: string }) => order.articleId === second);
    await agent.post(`/inventory/procurement-orders/${progress.id}/start`).expect(201);
    const removed = await save([change(first, 0, 12), change(second, 0, 7)]).expect(200);
    expect(removed.body.some((target: { articleId: string }) => [first, second].includes(target.articleId))).toBe(false);
    const result = await agent.get("/inventory/procurement-orders").expect(200);
    expect(result.body.find((order: { id: string }) => order.id === open.id).status).toBe("CANCELLED");
    expect(result.body.find((order: { id: string }) => order.id === progress.id).status).toBe("IN_PROGRESS");
  });
  it("allows only one concurrent save for the same absent target", async () => {
    const article = await createArticle("Bulk concurrent create");
    const responses = await Promise.all([save([change(article, 8, null)]), save([change(article, 10, null)])]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(await prisma.inventoryTarget.count({ where: { articleId: article, locationId: "loc-main" } })).toBe(1);
    expect(await prisma.auditEvent.count({ where: { entityId: `${article}:loc-main` } })).toBe(1);
  });
});
