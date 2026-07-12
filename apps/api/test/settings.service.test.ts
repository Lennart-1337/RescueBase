import { jest } from "@jest/globals";
import { SettingsService } from "../src/settings/settings.service.js";

describe("SettingsService", () => {
  function createService() {
    const prisma = {
      appSettings: { upsert: jest.fn() },
      alertAutomationConfig: { upsert: jest.fn() },
      inventoryAutomationConfig: { upsert: jest.fn() },
      alertEvent: { aggregate: jest.fn() }
    };
    const audit = { record: jest.fn() };
    const templates = { list: jest.fn() };
    const service = new SettingsService(prisma as never, audit as never, templates as never);
    return { service, prisma, audit, templates };
  }

  it("returns separate digest run and successful delivery timestamps", async () => {
    const { service, prisma, templates } = createService();
    const runAt = new Date("2026-07-08T04:00:00.000Z");
    const sentAt = new Date("2026-07-07T04:00:00.000Z");

    prisma.appSettings.upsert.mockResolvedValue({
      appName: "RescueBase",
      appSubtitle: "Sanitätslager",
      showLogo: true,
      showAppName: false,
      showAppSubtitle: true,
      timezone: "Europe/Berlin",
      newUserOrderNotificationsDefaultEnabled: false
    });
    prisma.alertAutomationConfig.upsert.mockResolvedValue({
      dailyDigestEnabled: true,
      dailyDigestTime: "06:00",
      warningWindowDays: 90,
      lastDigestSentAt: runAt
    });
    prisma.inventoryAutomationConfig.upsert.mockResolvedValue({
      enabled: true,
      dailyReconcileTime: "02:00",
      lastReconciledAt: null
    });
    prisma.alertEvent.aggregate.mockResolvedValue({
      _max: { lastDigestSentAt: sentAt }
    });
    templates.list.mockResolvedValue([]);

    const result = await service.getAll();

    expect(result.alerts).toEqual({
      dailyDigestEnabled: true,
      dailyDigestTime: "06:00",
      warningWindowDays: 90,
      lastDigestRunAt: runAt.toISOString(),
      lastDigestSentAt: sentAt.toISOString()
    });
  });

  it("keeps successful delivery empty when the digest job has run but delivered nothing", async () => {
    const { service, prisma, audit } = createService();
    const runAt = new Date("2026-07-08T04:00:00.000Z");

    prisma.alertAutomationConfig.upsert.mockResolvedValue({
      dailyDigestEnabled: true,
      dailyDigestTime: "06:00",
      warningWindowDays: 90,
      lastDigestSentAt: runAt
    });
    prisma.alertEvent.aggregate.mockResolvedValue({
      _max: { lastDigestSentAt: null }
    });

    const result = await service.updateAlerts({ dailyDigestTime: "07:15" });

    expect(prisma.alertAutomationConfig.upsert).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalled();
    expect(result).toEqual({
      dailyDigestEnabled: true,
      dailyDigestTime: "06:00",
      warningWindowDays: 90,
      lastDigestRunAt: runAt.toISOString(),
      lastDigestSentAt: null
    });
  });
});
