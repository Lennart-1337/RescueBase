import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
import * as request from "supertest";
import { MailService } from "../src/services/mail.service.js";
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
