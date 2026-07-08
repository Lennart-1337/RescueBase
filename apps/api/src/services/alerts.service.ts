import { BadRequestException, Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { AlertCategory, Prisma } from "@prisma/client";
import { buildAlertWarnings, type AlertWarning } from "../alerts/alert-engine.js";
import { AuditService } from "./audit.service.js";
import { MailService } from "./mail.service.js";
import { PrismaService } from "../persistence/prisma.service.js";
import { isScheduleDue } from "../settings/settings-schedule.js";
import { defaultTimezone } from "../settings/default-timezone.js";

const configId = "singleton";

type WarningInput = Parameters<typeof buildAlertWarnings>[0];
type BatchWarningInput = WarningInput["batches"][number];
type DeviceWarningInput = WarningInput["devices"][number];
type TargetWarningInput = NonNullable<WarningInput["targets"]>[number];

type AlertEventRecord = {
  id: string;
  category: AlertCategory;
  sourceType: string;
  sourceId: string;
  locationId: string | null;
  title: string;
  details: string;
  dueAt: Date | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  resolvedAt: Date | null;
  metadata: Prisma.JsonValue | null;
  lastImmediateSentAt: Date | null;
  lastDigestSentAt: Date | null;
};

type AlertSubscriptionRecord = {
  id: string;
  userId: string;
  category: AlertCategory;
  locationId: string | null;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
  location: { id: string; name: string } | null;
};

@Injectable()
export class AlertsService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AlertsService.name);
  private digestTimer?: NodeJS.Timeout;
  private sweepTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly audit: AuditService
  ) {}

  async onApplicationBootstrap() {
    if (process.env.NODE_ENV === "test") return;
    await this.syncAlerts("boot");
    this.sweepTimer = setInterval(() => void this.syncAlerts("schedule").catch((error) => this.logger.error(error)), 15 * 60_000);
    this.digestTimer = setInterval(() => void this.runDailyDigestIfDue().catch((error) => this.logger.error(error)), 60_000);
  }

  onModuleDestroy() {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    if (this.digestTimer) clearInterval(this.digestTimer);
  }

  async listWarnings(filters: { category?: string; locationId?: string } = {}) {
    const warnings = (await this.prisma.alertEvent.findMany({
      where: {
        resolvedAt: null,
        category: filters.category as AlertCategory | undefined,
        locationId: filters.locationId
      },
      orderBy: [{ category: "asc" }, { locationId: "asc" }, { dueAt: "asc" }]
    })) as AlertEventRecord[];
    const locations = await this.prisma.location.findMany({
      where: { id: { in: warnings.map((warning) => warning.locationId).filter(Boolean) as string[] }, deletedAt: null }
    });
    const locationMap = new Map(locations.map((location: { id: string; name: string }) => [location.id, location.name]));
    return {
      generatedAt: new Date().toISOString(),
      warnings: warnings.map((warning) => this.toWarningView(warning, locationMap.get(warning.locationId ?? "") ?? null)),
      summary: {
        expiry: warnings.filter((warning) => warning.category === AlertCategory.EXPIRY).length,
        stkDue: warnings.filter((warning) => warning.category === AlertCategory.STK_DUE).length,
        mtkDue: warnings.filter((warning) => warning.category === AlertCategory.MTK_DUE).length,
        shortage: warnings.filter((warning) => warning.category === AlertCategory.SHORTAGE).length
      }
    };
  }

  async listMySubscriptions(userId: string) {
    return this.listSubscriptions({ userId });
  }

  async listAdminSubscriptions() {
    return this.listSubscriptions();
  }

  async replaceMySubscriptions(userId: string, subscriptions: Array<{ category: AlertCategory; locationId?: string | null }>) {
    const normalized = await this.normalizeSubscriptions(userId, subscriptions);
    await this.prisma.$transaction(async (tx) => {
      await tx.alertSubscription.deleteMany({ where: { userId } });
      if (normalized.length > 0) {
        await tx.alertSubscription.createMany({ data: normalized });
      }
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: await this.resolveUserLabel(userId),
      action: "ALERT_SUBSCRIPTIONS_UPDATED",
      entityType: "AlertSubscription",
      entityId: userId,
      payload: { subscriptions: normalized }
    });
    return this.listMySubscriptions(userId);
  }

  async syncAlerts(reason: string) {
    const now = new Date();
    const config = await this.ensureConfig();
    const batchRows = await this.prisma.batch.findMany({
      where: { deletedAt: null, quantity: { gt: 0 } },
      include: { article: true, location: true },
      orderBy: [{ expiresAt: "asc" }]
    });
    const deviceRows = await this.prisma.medicalDevice.findMany({
      where: { active: true },
      include: { article: true, location: true },
      orderBy: [{ name: "asc" }]
    });
    const targetRows = await this.prisma.inventoryTarget.findMany({
      include: { article: true, location: true },
      orderBy: [{ article: { name: "asc" } }, { location: { name: "asc" } }]
    });
    const usableStock = await this.usableStockMap(now);
    const warnings = buildAlertWarnings(
      {
        batches: batchRows.map((row): BatchWarningInput => ({
          id: row.id,
          articleId: row.articleId,
          articleName: row.article.name,
          locationId: row.locationId,
          locationName: row.location.name,
          lotNumber: row.lotNumber,
          expiresAt: row.expiresAt,
          quantity: row.quantity
        })),
        devices: deviceRows.map((row): DeviceWarningInput => ({
          id: row.id,
          articleId: row.articleId,
          articleName: row.article.name,
          locationId: row.locationId,
          locationName: row.location.name,
          name: row.name,
          serialNumber: row.serialNumber,
          inventoryNumber: row.inventoryNumber,
          lastStkAt: row.lastStkAt,
          lastMtkAt: row.lastMtkAt,
          stkIntervalMonths: row.stkIntervalMonths,
          mtkIntervalMonths: row.mtkIntervalMonths,
          article: {
            stkRequired: row.article.stkRequired,
            mtkRequired: row.article.mtkRequired,
            stkIntervalMonths: row.article.stkIntervalMonths,
            mtkIntervalMonths: row.article.mtkIntervalMonths
          }
        })),
        targets: targetRows.map((row): TargetWarningInput => {
          const currentQuantity = usableStock.get(targetKey(row.articleId, row.locationId)) ?? 0;
          return {
            id: row.id,
            articleId: row.articleId,
            articleName: row.article.name,
            locationId: row.locationId,
            locationName: row.location.name,
            targetQuantity: row.targetQuantity,
            currentQuantity,
            shortageQuantity: Math.max(row.targetQuantity - currentQuantity, 0),
            unit: row.article.unit
          };
        })
      },
      now,
      config.warningWindowDays
    ) as AlertWarning[];

    const openKeys = new Set(warnings.map((warning) => warningKey(warning.category, warning.sourceType, warning.sourceId)));
    const existing = (await this.prisma.alertEvent.findMany()) as AlertEventRecord[];
    const currentEvents = new Map(existing.map((event: AlertEventRecord) => [warningKey(event.category, event.sourceType, event.sourceId), event]));
    const createdOrReopened: Array<AlertEventRecord> = [];

    for (const warning of warnings) {
      const key = warningKey(warning.category, warning.sourceType, warning.sourceId);
      const event = currentEvents.get(key);
      if (!event) {
        const created = await this.prisma.alertEvent.create({
          data: {
            category: warning.category,
            sourceType: warning.sourceType,
            sourceId: warning.sourceId,
            locationId: warning.locationId,
            title: warning.title,
            details: warning.details,
            dueAt: new Date(warning.dueAt),
            firstSeenAt: now,
            lastSeenAt: now,
            metadata: warning.metadata as Prisma.JsonObject
          }
        });
        createdOrReopened.push(created);
        await this.audit.record({
          actorType: "SYSTEM",
          actorLabel: "Alert pipeline",
          action: "ALERT_CREATED",
          entityType: "AlertEvent",
          entityId: created.id,
          payload: warning
        });
        continue;
      }
      const reopened = Boolean(event.resolvedAt);
      const updated = await this.prisma.alertEvent.update({
        where: { id: event.id },
        data: {
          locationId: warning.locationId,
          title: warning.title,
          details: warning.details,
          dueAt: new Date(warning.dueAt),
          lastSeenAt: now,
          resolvedAt: null,
          metadata: warning.metadata as Prisma.JsonObject
        }
      });
      if (reopened) {
        createdOrReopened.push(updated);
      }
    }

    const resolvedEvents = existing.filter((event) => event.resolvedAt === null && !openKeys.has(warningKey(event.category, event.sourceType, event.sourceId)));
    for (const event of resolvedEvents) {
      await this.prisma.alertEvent.update({
        where: { id: event.id },
        data: { resolvedAt: now }
      });
    }

    if (createdOrReopened.length > 0) {
      await this.sendImmediateAlerts(createdOrReopened);
    }

    await this.audit.record({
      actorType: "SYSTEM",
      actorLabel: "Alert pipeline",
      action: "ALERT_SYNCED",
      entityType: "AlertEvent",
      entityId: reason,
      payload: { createdOrReopened: createdOrReopened.length, resolved: resolvedEvents.length, warnings: warnings.length, reason }
    });
  }

  async runDailyDigestIfDue() {
    const now = new Date();
    const [config, general] = await Promise.all([this.ensureConfig(), this.ensureAppSettings()]);
    if (!config.dailyDigestEnabled || !isScheduleDue(now, config.lastDigestSentAt, config.dailyDigestTime, general.timezone)) return;
    await this.runDailyDigest();
    await this.prisma.alertAutomationConfig.update({
      where: { id: configId },
      data: { lastDigestSentAt: now }
    });
  }

  async runDailyDigest() {
    const openEvents = await this.prisma.alertEvent.findMany({ where: { resolvedAt: null }, orderBy: [{ category: "asc" }, { locationId: "asc" }, { dueAt: "asc" }] });
    if (openEvents.length === 0) return;
    const locations = await this.prisma.location.findMany({
      where: { id: { in: openEvents.map((event) => event.locationId).filter(Boolean) as string[] }, deletedAt: null }
    });
    const locationMap = new Map(locations.map((location: { id: string; name: string }) => [location.id, location.name]));
    const subscriptions = await this.prisma.alertSubscription.findMany({ include: { user: true, location: true } });
    const recipients = this.resolveRecipients(openEvents, subscriptions);
    for (const recipient of recipients) {
      const warnings = openEvents.filter((event) => this.matchesSubscription(event, recipient.subscriptions));
      if (warnings.length === 0) continue;
      await this.mail.sendAlertDigest(
        recipient.user.email,
        {
          recipientName: recipient.user.displayName,
          warnings: warnings.map((warning) => ({
            category: warning.category,
            dueAt: warning.dueAt,
            locationName: warning.locationId ? locationMap.get(warning.locationId) ?? null : null,
            title: warning.title
          }))
        },
        this.publicLinkForDigest(warnings[0]?.category ?? AlertCategory.EXPIRY)
      );
      await this.prisma.alertEvent.updateMany({
        where: { id: { in: warnings.map((warning) => warning.id) } },
        data: { lastDigestSentAt: new Date() }
      });
      await this.audit.record({
        actorType: "SYSTEM",
        actorLabel: "Alert pipeline",
        action: "ALERT_DIGEST_SENT",
        entityType: "AlertEvent",
        entityId: recipient.user.id,
        payload: { count: warnings.length }
      });
    }
  }

  private async sendImmediateAlerts(events: AlertEventRecord[]) {
    const subscriptions = (await this.prisma.alertSubscription.findMany({ include: { user: true, location: true } })) as AlertSubscriptionRecord[];
    for (const event of events) {
      const recipients = this.resolveRecipients([event], subscriptions);
      for (const recipient of recipients) {
        await this.mail.sendImmediateAlert(
          recipient.user.email,
          {
            category: event.category,
            details: event.details,
            dueAt: event.dueAt,
            recipientName: recipient.user.displayName,
            title: event.title
          },
          this.publicLinkForCategory(event.category)
        );
        await this.audit.record({
          actorType: "SYSTEM",
          actorLabel: "Alert pipeline",
          action: "ALERT_EMAIL_SENT",
          entityType: "AlertEvent",
          entityId: event.id,
          payload: { category: event.category, recipient: recipient.user.email }
        });
      }
      await this.prisma.alertEvent.update({
        where: { id: event.id },
        data: { lastImmediateSentAt: new Date() }
      });
    }
  }

  private resolveRecipients(events: Array<{ category: AlertCategory; locationId: string | null }>, subscriptions: AlertSubscriptionRecord[]) {
    const users = new Map<string, { user: AlertSubscriptionRecord["user"]; subscriptions: AlertSubscriptionRecord[] }>();
    for (const subscription of subscriptions) {
      for (const event of events) {
        if (!this.matchesSubscription(event, [subscription])) continue;
        const current = users.get(subscription.userId) ?? { user: subscription.user, subscriptions: [] };
        current.subscriptions.push(subscription);
        users.set(subscription.userId, current);
      }
    }
    return [...users.values()];
  }

  private matchesSubscription(event: { category: AlertCategory; locationId: string | null }, subscriptions: AlertSubscriptionRecord[]) {
    return subscriptions.some((subscription) =>
      subscription.category === event.category && (subscription.locationId === null || subscription.locationId === event.locationId)
    );
  }

  private async normalizeSubscriptions(userId: string, subscriptions: Array<{ category: AlertCategory; locationId?: string | null }>) {
    const locations = await this.prisma.location.findMany({ select: { id: true } });
    const locationIds = new Set(locations.map((location: { id: string }) => location.id));
    const normalized = subscriptions.map((subscription): { userId: string; category: AlertCategory; locationId: string | null } => {
      if (!Object.values(AlertCategory).includes(subscription.category)) {
        throw new BadRequestException("Ungültige Alarmkategorie.");
      }
      if (subscription.locationId && !locationIds.has(subscription.locationId)) {
        throw new BadRequestException("Lagerort nicht gefunden.");
      }
      return {
        userId,
        category: subscription.category,
        locationId: subscription.locationId ?? null
      };
    });
    const deduped = new Map<string, { userId: string; category: AlertCategory; locationId: string | null }>();
    for (const subscription of normalized) {
      deduped.set(`${subscription.category}:${subscription.locationId ?? "global"}`, subscription);
    }
    return [...deduped.values()];
  }

  private async listSubscriptions(filters: { userId?: string } = {}) {
    const subscriptions = (await this.prisma.alertSubscription.findMany({
      where: { userId: filters.userId },
      include: { user: true, location: true },
      orderBy: [{ user: { email: "asc" } }, { category: "asc" }, { locationId: "asc" }]
    })) as AlertSubscriptionRecord[];
    return subscriptions.map((subscription) => ({
      id: subscription.id,
      userId: subscription.userId,
      category: subscription.category,
      locationId: subscription.locationId,
      locationName: subscription.location?.name ?? null,
      user: {
        id: subscription.user.id,
        email: subscription.user.email,
        displayName: subscription.user.displayName
      }
    }));
  }

  private async resolveUserLabel(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user ? `${user.displayName} <${user.email}>` : userId;
  }

  private toWarningView(event: AlertEventRecord, locationName: string | null) {
    return {
      id: event.id,
      category: event.category,
      sourceType: event.sourceType,
      sourceId: event.sourceId,
      locationId: event.locationId,
      locationName,
      title: event.title,
      details: event.details,
      dueAt: event.dueAt?.toISOString() ?? null,
      firstSeenAt: event.firstSeenAt.toISOString(),
      lastSeenAt: event.lastSeenAt.toISOString(),
      metadata: event.metadata
    };
  }

  private publicLinkForCategory(category: AlertCategory) {
    const base = process.env.APP_PUBLIC_URL ?? "http://localhost:5173";
    const path = category === AlertCategory.EXPIRY
      ? "/admin/inventory?warning=expiry"
      : category === AlertCategory.SHORTAGE
        ? "/admin/inventory"
        : "/admin/master-data?tab=devices";
    return new URL(path, base).toString();
  }

  private publicLinkForDigest(category: AlertCategory) {
    return this.publicLinkForCategory(category);
  }

  private ensureConfig() {
    return this.prisma.alertAutomationConfig.upsert({ where: { id: configId }, update: {}, create: { id: configId } });
  }

  private ensureAppSettings() {
    return this.prisma.appSettings.upsert({ where: { id: configId }, update: {}, create: { id: configId, timezone: defaultTimezone() } });
  }

  private async usableStockMap(now: Date) {
    const batches = await this.prisma.batch.findMany({
      where: { deletedAt: null, expiresAt: { gt: now }, quantity: { gt: 0 } }
    });
    const stock = new Map<string, number>();
    for (const batch of batches) {
      const key = targetKey(batch.articleId, batch.locationId);
      stock.set(key, (stock.get(key) ?? 0) + batch.quantity);
    }
    return stock;
  }
}

function warningKey(category: AlertCategory, sourceType: string, sourceId: string) {
  return `${category}:${sourceType}:${sourceId}`;
}

function targetKey(articleId: string, locationId: string) {
  return `${articleId}:${locationId}`;
}
