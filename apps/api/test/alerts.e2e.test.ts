import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
// @ts-expect-error supertest ships export= typings; default import is correct with ts-jest runtime.
import request from "supertest";
import { MailService } from "../src/services/mail.service.js";
import { PushService } from "../src/services/push.service.js";
import { PrismaService } from "../src/persistence/prisma.service.js";
import { AlertsService } from "../src/services/alerts.service.js";
import { bootstrapTestApp } from "./bootstrap-test-app.js";

jest.setTimeout(45_000);

describe("alerts pipeline", () => {
  let app: INestApplication;
  let closeApp: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const harness = await bootstrapTestApp({ databaseName: "rescuebase_alerts_test" });
    app = harness.app;
    closeApp = harness.close;
  });

  afterAll(async () => {
    await closeApp?.();
  });

  it("stores alert subscriptions and emits expiry plus STK warnings immediately", async () => {
    const server = app.getHttpServer();
    const agent = request.agent(server);
    await agent.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);

    const mailService = app.get(MailService);
    const sendSpy = jest.spyOn(mailService, "sendImmediateAlert").mockResolvedValue({});
    const pushService = app.get(PushService);
    const pushSpy = jest.spyOn(pushService, "sendToUsers").mockResolvedValue(undefined);

    await agent
      .put("/alerts/subscriptions/me")
      .send({
        subscriptions: [
          { category: "EXPIRY" },
          { category: "STK_DUE", locationId: "loc-main" }
        ]
      })
      .expect(200);

    const subscriptions = await agent.get("/alerts/subscriptions/me").expect(200);
    expect(subscriptions.body).toHaveLength(2);

    const expiryDate = daysFromNow(14);
    await agent
      .post("/inventory/batches")
      .send({
        articleId: "article-bandage",
        locationId: "loc-main",
        lotNumber: "ALERT-001",
        expiresAt: expiryDate,
        quantity: 3
      })
      .expect(201);

    expect(sendSpy).toHaveBeenCalled();
    expect(sendSpy).toHaveBeenCalledWith(
      "admin@rescuebase.local",
      expect.objectContaining({ category: "EXPIRY" }),
      expect.any(String)
    );
    expect(pushSpy).toHaveBeenCalledWith(
      ["user-admin"],
      expect.objectContaining({ title: expect.any(String), url: expect.stringContaining("/admin/inventory") })
    );

    const deviceDate = daysAgo(330);
    await agent
      .post("/catalog/devices")
      .send({
        name: "Defibrillator A",
        articleId: "article-tourniquet",
        locationId: "loc-main",
        serialNumber: "SN-99",
        inventoryNumber: "INV-99",
        lastStkAt: deviceDate,
        stkIntervalMonths: 12,
        active: true
      })
      .expect(201);

    const warnings = await agent.get("/alerts/warnings").expect(200);
    expect(warnings.body.summary.expiry).toBeGreaterThanOrEqual(1);
    expect(warnings.body.summary.stkDue).toBeGreaterThanOrEqual(1);
    expect(warnings.body.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "EXPIRY" }),
        expect.objectContaining({ category: "STK_DUE" })
      ])
    );
  });

  it("warns subscribed users when a kit has missed its monthly check", async () => {
    const server = app.getHttpServer();
    const agent = request.agent(server);
    const prisma = app.get(PrismaService);
    const alerts = app.get(AlertsService);
    await agent.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);
    await agent.put("/alerts/subscriptions/me").send({ subscriptions: [{ category: "KIT_CHECK_DUE", locationId: "loc-main" }] }).expect(200);
    await prisma.kit.update({ where: { id: "kit-rucksack-1" }, data: { createdAt: daysAgo(32) } });
    await prisma.check.updateMany({ where: { kitId: "kit-rucksack-1" }, data: { createdAt: daysAgo(32) } });

    await alerts.syncAlerts("test-kit-check-due");

    const warnings = await agent.get("/alerts/warnings").expect(200);
    expect(warnings.body.summary.kitCheckDue).toBe(1);
    expect(warnings.body.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ category: "KIT_CHECK_DUE", sourceId: "kit-rucksack-1" })]));
  });
});

function daysFromNow(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function daysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}
