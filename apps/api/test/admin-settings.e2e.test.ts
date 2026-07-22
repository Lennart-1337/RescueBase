import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
// @ts-expect-error supertest ships export= typings; default import is correct with ts-jest runtime.
import request from "supertest";
import { PrismaService } from "../src/persistence/prisma.service.js";
import { bootstrapTestApp } from "./bootstrap-test-app.js";
import { defaultTimezone } from "../src/settings/default-timezone.js";

jest.setTimeout(45_000);

describe("admin settings", () => {
  let app: INestApplication;
  let closeApp: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const harness = await bootstrapTestApp({ databaseName: "rescuebase_admin_settings_test" });
    app = harness.app;
    closeApp = harness.close;
  });

  afterAll(async () => closeApp?.());

  it("returns preserved defaults to admins and rejects warehouse users", async () => {
    const admin = await login("admin@rescuebase.local", "rescuebase-admin");
    const response = await admin.get("/admin/settings").expect(200);
    expect(response.body).toMatchObject({
      general: {
        appName: "RescueBase",
        appSubtitle: "Sanitätslager",
        showLogo: true,
        showAppName: false,
        showAppSubtitle: true,
        timezone: defaultTimezone(),
        newUserOrderNotificationsDefaultEnabled: false
      },
      alerts: { dailyDigestEnabled: true, dailyDigestTime: "06:00", warningWindowDays: 90, lastDigestRunAt: null, lastDigestSentAt: null },
      inventory: { enabled: true, dailyReconcileTime: "02:00", lastReconciledAt: null },
      kitChecks: { enabled: true, intervalMonths: 1, warningLeadDays: 0 }
    });
    expect(response.body.templates.map((template: { key: string }) => template.key)).toEqual([
      "ALERT_IMMEDIATE", "ALERT_DIGEST", "NEW_ORDER"
    ]);
    const warehouse = await login("lager@rescuebase.local", "rescuebase-lager");
    await warehouse.get("/admin/settings").expect(403);
  });

  it("updates groups and validates timezone, time, and warning window", async () => {
    const admin = await login("admin@rescuebase.local", "rescuebase-admin");
    await admin.post("/admin/settings/general").send({
      appName: "RescueBase Pro",
      appSubtitle: "Bereitschaft Nord",
      showLogo: false,
      showAppName: true,
      showAppSubtitle: true,
      timezone: "Europe/Berlin",
      newUserOrderNotificationsDefaultEnabled: true
    }).expect(201).expect(({ body }) => expect(body).toEqual({
      appName: "RescueBase Pro",
      appSubtitle: "Bereitschaft Nord",
      showLogo: false,
      showAppName: true,
      showAppSubtitle: true,
      timezone: "Europe/Berlin",
      newUserOrderNotificationsDefaultEnabled: true
    }));
    await admin.post("/admin/settings/alerts").send({ dailyDigestEnabled: false, dailyDigestTime: "07:15", warningWindowDays: 30 })
      .expect(201).expect(({ body }) => expect(body).toMatchObject({ dailyDigestEnabled: false, dailyDigestTime: "07:15", warningWindowDays: 30 }));
    await admin.post("/admin/settings/inventory").send({ enabled: false, dailyReconcileTime: "03:45" })
      .expect(201).expect(({ body }) => expect(body).toMatchObject({ enabled: false, dailyReconcileTime: "03:45" }));
    await admin.post("/admin/settings/kit-checks").send({ enabled: true, intervalMonths: 2, warningLeadDays: 7 })
      .expect(201).expect(({ body }) => expect(body).toEqual({ enabled: true, intervalMonths: 2, warningLeadDays: 7 }));
    await admin.post("/admin/settings/general").send({ timezone: "Mars/Olympus" }).expect(400);
    await admin.post("/admin/settings/general").send({ appName: "" }).expect(400);
    await admin.post("/admin/settings/alerts").send({ dailyDigestTime: "24:00" }).expect(400);
    await admin.post("/admin/settings/alerts").send({ warningWindowDays: 0 }).expect(400);
    await admin.post("/admin/settings/inventory").send({ enabled: "yes" }).expect(400);
    await admin.post("/admin/settings/kit-checks").send({ intervalMonths: 0 }).expect(400);
    await admin.post("/admin/settings/kit-checks").send({ warningLeadDays: 366 }).expect(400);
  });

  it("allows admins to trigger the daily digest manually", async () => {
    const admin = await login("admin@rescuebase.local", "rescuebase-admin");
    await admin.post("/admin/settings/alerts/digest").send({}).expect(201).expect(({ body }) => {
      expect(body).toEqual({ recipientCount: 0, warningCount: 0 });
    });

    const warehouse = await login("lager@rescuebase.local", "rescuebase-lager");
    await warehouse.post("/admin/settings/alerts/digest").send({}).expect(403);
  });

  it("restricts placeholders and returns a branded preview", async () => {
    const admin = await login("admin@rescuebase.local", "rescuebase-admin");
    await admin.post("/admin/settings/templates/ALERT_IMMEDIATE").send({ subjectTemplate: "{{orderId}}" }).expect(400);
    const updated = await admin.post("/admin/settings/templates/ALERT_IMMEDIATE").send({
      subjectTemplate: "Warnung: {{title}}",
      introTemplate: "Hallo {{recipientName}},",
      bodyTemplate: "{{details}}\nFällig: {{dueDate}}"
    }).expect(201);
    expect(updated.body.allowedPlaceholders).toContain("title");
    const preview = await admin.post("/admin/settings/templates/ALERT_IMMEDIATE/preview").send({
      subjectTemplate: "ENTWURF {{title}}",
      introTemplate: "Vorschau für {{recipientName}}",
      bodyTemplate: "Noch nicht gespeichert: {{details}}"
    }).expect(201);
    expect(preview.body).toMatchObject({ subject: expect.stringContaining("ENTWURF Ablaufwarnung"), text: expect.stringContaining("Noch nicht gespeichert") });
    expect(preview.body.html).toContain("<!doctype html>");
    expect(preview.body.html).toContain("RescueBase");
    expect((await admin.get("/admin/settings")).body.templates.find((template: { key: string }) => template.key === "ALERT_IMMEDIATE").subjectTemplate)
      .toBe("Warnung: {{title}}");
  });

  it("uses the configured warning window when synchronizing alerts", async () => {
    const admin = await login("admin@rescuebase.local", "rescuebase-admin");
    await admin.post("/admin/settings/alerts").send({ warningWindowDays: 1 }).expect(201);
    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + 14);
    await admin.post("/inventory/batches").send({
      articleId: "article-bandage", locationId: "loc-main", lotNumber: "OUTSIDE-WINDOW", expiresAt: expiresAt.toISOString(), quantity: 1
    }).expect(201);
    const warnings = await admin.get("/alerts/warnings").expect(200);
    expect(warnings.body.warnings).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ metadata: expect.objectContaining({ lotNumber: "OUTSIDE-WINDOW" }) })
    ]));
  });

  it("applies the global order email default only to newly invited users", async () => {
    const admin = await login("admin@rescuebase.local", "rescuebase-admin");
    await admin.post("/admin/settings/general").send({ newUserOrderNotificationsDefaultEnabled: true }).expect(201);
    const prisma = app.get(PrismaService);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: "user-lager" } })).newOrderNotificationsEnabled).toBe(false);
    const invitation = await admin.post("/auth/invite").send({ email: "default-on@example.org", displayName: "Neu", role: "WAREHOUSE" }).expect(201);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: invitation.body.id } })).newOrderNotificationsEnabled).toBe(true);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: "user-lager" } })).newOrderNotificationsEnabled).toBe(false);
  });

  it("separates the last digest run from the last successful delivery timestamp", async () => {
    const admin = await login("admin@rescuebase.local", "rescuebase-admin");
    const prisma = app.get(PrismaService);
    const runAt = new Date("2026-07-08T04:00:00.000Z");
    const sentAt = new Date("2026-07-07T04:00:00.000Z");

    await prisma.alertAutomationConfig.update({
      where: { id: "singleton" },
      data: { lastDigestSentAt: runAt }
    });
    await prisma.alertEvent.create({
      data: {
        category: "EXPIRY",
        sourceType: "BATCH",
        sourceId: "digest-settings-test",
        locationId: "loc-main",
        title: "Ablaufwarnung",
        details: "Testwarnung",
        dueAt: new Date("2026-07-10T00:00:00.000Z"),
        firstSeenAt: sentAt,
        lastSeenAt: sentAt,
        lastDigestSentAt: sentAt
      }
    });

    await admin.get("/admin/settings").expect(200).expect(({ body }) => {
      expect(body.alerts).toMatchObject({
        lastDigestRunAt: runAt.toISOString(),
        lastDigestSentAt: sentAt.toISOString()
      });
    });
  });

  async function login(email: string, password: string) {
    const agent = request.agent(app.getHttpServer());
    await agent.post("/auth/login").send({ email, password }).expect(201);
    return agent;
  }
});
