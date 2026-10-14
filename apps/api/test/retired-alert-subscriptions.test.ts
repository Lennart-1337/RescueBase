import { AlertCategory } from "@prisma/client";
import { AlertsService } from "../src/services/alerts.service.js";
import type { PrismaService } from "../src/persistence/prisma.service.js";
import type { MailService } from "../src/services/mail.service.js";
import type { AuditService } from "../src/services/audit.service.js";
import type { PushService } from "../src/services/push.service.js";

describe("retired device alert subscriptions", () => {
  it.each([AlertCategory.STK_DUE, AlertCategory.MTK_DUE])("rejects %s subscriptions", async (category) => {
    const prisma = { location: { findMany: async () => [] } } as unknown as PrismaService;
    const service = new AlertsService(prisma, {} as MailService, {} as AuditService, {} as PushService);
    await expect(service.replaceMySubscriptions("user", [{ category }])).rejects.toThrow("Ungültige Alarmkategorie.");
  });
});
