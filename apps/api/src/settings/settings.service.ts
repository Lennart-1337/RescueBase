import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { AuditService } from "../services/audit.service.js";
import { PrismaService } from "../persistence/prisma.service.js";
import type { AlertSettingsInput, GeneralSettingsInput, InventorySettingsInput } from "./settings.types.js";
import { validateBoolean, validateDisplayText, validateTime, validateTimezone, validateWarningWindow } from "./settings-validation.js";
import { defaultTimezone } from "./default-timezone.js";
import { NotificationTemplatesService } from "./notification-templates.service.js";

const singletonId = "singleton";
export const defaultAppName = "RescueBase";
export const defaultAppSubtitle = "Sanitätslager";
export const defaultShowLogo = true;
export const defaultShowAppName = false;
export const defaultShowAppSubtitle = true;

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly templates: NotificationTemplatesService) {}

  async getAll() {
    const [general, alerts, inventory, templates] = await Promise.all([
      this.ensureGeneral(), this.ensureAlerts(), this.ensureInventory(), this.templates.list()
    ]);
    return {
      general: this.generalView(general),
      alerts: await this.alertsView(alerts),
      inventory: this.inventoryView(inventory),
      templates
    };
  }

  async updateGeneral(input: GeneralSettingsInput) {
    const data: Prisma.AppSettingsUpdateInput = {};
    if (input.appName !== undefined) data.appName = validateDisplayText(input.appName, "App-Name");
    if (input.appSubtitle !== undefined) data.appSubtitle = validateDisplayText(input.appSubtitle, "Untertitel");
    if (input.showLogo !== undefined) data.showLogo = validateBoolean(input.showLogo, "Logo anzeigen");
    if (input.showAppName !== undefined) data.showAppName = validateBoolean(input.showAppName, "App-Name anzeigen");
    if (input.showAppSubtitle !== undefined) data.showAppSubtitle = validateBoolean(input.showAppSubtitle, "Untertitel anzeigen");
    if (input.timezone !== undefined) data.timezone = validateTimezone(input.timezone);
    if (input.newUserOrderNotificationsDefaultEnabled !== undefined) {
      data.newUserOrderNotificationsDefaultEnabled = validateBoolean(input.newUserOrderNotificationsDefaultEnabled, "Standard für Bestellbenachrichtigungen");
    }
    const row = await this.prisma.appSettings.upsert({
      where: { id: singletonId },
      update: data,
      create: {
        id: singletonId,
        appName: defaultAppName,
        appSubtitle: defaultAppSubtitle,
        showLogo: defaultShowLogo,
        showAppName: defaultShowAppName,
        showAppSubtitle: defaultShowAppSubtitle,
        timezone: defaultTimezone(),
        ...data as Prisma.AppSettingsCreateInput
      }
    });
    await this.record("APP_SETTINGS_UPDATED", data);
    return this.generalView(row);
  }

  async updateAlerts(input: AlertSettingsInput) {
    const data: Prisma.AlertAutomationConfigUpdateInput = {};
    if (input.dailyDigestEnabled !== undefined) data.dailyDigestEnabled = validateBoolean(input.dailyDigestEnabled, "Tagesdigest");
    if (input.dailyDigestTime !== undefined) data.dailyDigestTime = validateTime(input.dailyDigestTime);
    if (input.warningWindowDays !== undefined) data.warningWindowDays = validateWarningWindow(input.warningWindowDays);
    const row = await this.prisma.alertAutomationConfig.upsert({ where: { id: singletonId }, update: data, create: { id: singletonId, ...data as Prisma.AlertAutomationConfigCreateInput } });
    await this.record("ALERT_AUTOMATION_CONFIG_UPDATED", data);
    return this.alertsView(row);
  }

  async updateInventory(input: InventorySettingsInput) {
    const data: Prisma.InventoryAutomationConfigUpdateInput = {};
    if (input.enabled !== undefined) data.enabled = validateBoolean(input.enabled, "Bestandsautomatisierung");
    if (input.dailyReconcileTime !== undefined) data.dailyReconcileTime = validateTime(input.dailyReconcileTime);
    const row = await this.prisma.inventoryAutomationConfig.upsert({ where: { id: singletonId }, update: data, create: { id: singletonId, ...data as Prisma.InventoryAutomationConfigCreateInput } });
    await this.record("INVENTORY_AUTOMATION_CONFIG_UPDATED", data);
    return this.inventoryView(row);
  }

  private ensureGeneral() {
    return this.prisma.appSettings.upsert({
      where: { id: singletonId },
      update: {},
      create: {
        id: singletonId,
        appName: defaultAppName,
        appSubtitle: defaultAppSubtitle,
        showLogo: defaultShowLogo,
        showAppName: defaultShowAppName,
        showAppSubtitle: defaultShowAppSubtitle,
        timezone: defaultTimezone()
      }
    });
  }

  private ensureAlerts() {
    return this.prisma.alertAutomationConfig.upsert({ where: { id: singletonId }, update: {}, create: { id: singletonId } });
  }

  private ensureInventory() {
    return this.prisma.inventoryAutomationConfig.upsert({ where: { id: singletonId }, update: {}, create: { id: singletonId } });
  }

  private generalView(row: {
    appName: string;
    appSubtitle: string;
    showLogo: boolean;
    showAppName: boolean;
    showAppSubtitle: boolean;
    timezone: string;
    newUserOrderNotificationsDefaultEnabled: boolean;
  }) {
    return {
      appName: row.appName,
      appSubtitle: row.appSubtitle,
      showLogo: row.showLogo,
      showAppName: row.showAppName,
      showAppSubtitle: row.showAppSubtitle,
      timezone: row.timezone,
      newUserOrderNotificationsDefaultEnabled: row.newUserOrderNotificationsDefaultEnabled
    };
  }

  private async alertsView(row: { dailyDigestEnabled: boolean; dailyDigestTime: string; warningWindowDays: number; lastDigestSentAt: Date | null }) {
    const latestDigestDelivery = await this.prisma.alertEvent.aggregate({
      _max: { lastDigestSentAt: true }
    });
    return {
      dailyDigestEnabled: row.dailyDigestEnabled,
      dailyDigestTime: row.dailyDigestTime,
      warningWindowDays: row.warningWindowDays,
      lastDigestRunAt: row.lastDigestSentAt?.toISOString() ?? null,
      lastDigestSentAt: latestDigestDelivery._max.lastDigestSentAt?.toISOString() ?? null
    };
  }

  private inventoryView(row: { enabled: boolean; dailyReconcileTime: string; lastReconciledAt: Date | null }) {
    return { enabled: row.enabled, dailyReconcileTime: row.dailyReconcileTime, lastReconciledAt: row.lastReconciledAt?.toISOString() ?? null };
  }

  private record(action: string, payload: Record<string, unknown>) {
    return this.audit.record({ actorType: "USER", actorLabel: "Admin", action, entityType: "AppSettings", entityId: singletonId, payload });
  }
}
