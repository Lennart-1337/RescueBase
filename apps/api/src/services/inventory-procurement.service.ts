import { BadRequestException, Injectable, Logger, NotFoundException, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { InventoryProcurementStatus } from "@prisma/client";
import { AuditService } from "./audit.service.js";
import { PrismaService } from "../persistence/prisma.service.js";
import { toIsoDate, toIsoDateTime } from "../persistence/mappers.js";
import { isScheduleDue } from "../settings/settings-schedule.js";
import { defaultTimezone } from "../settings/default-timezone.js";

const configId = "singleton";
const activeOrderStatuses: InventoryProcurementStatus[] = [
  InventoryProcurementStatus.OPEN,
  InventoryProcurementStatus.IN_PROGRESS
];

type ProcurementOrderRecord = {
  id: string;
  articleId: string;
  locationId: string;
  status: InventoryProcurementStatus;
  requestedQuantity: number;
  receivedQuantity: number;
  articleUrlSnapshot: string | null;
  activeKey: string | null;
  createdAt: Date;
  updatedAt: Date;
  article: { id: string; name: string; unit: string; articleUrl: string | null };
  location: { id: string; name: string };
  receipts: Array<{
    id: string;
    batchId: string;
    quantity: number;
    lotNumber: string;
    expiresAt: Date;
    verifiedAt: Date;
    verifiedBy: string;
    createdAt: Date;
  }>;
};

@Injectable()
export class InventoryProcurementService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(InventoryProcurementService.name);
  private reconcileTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async onApplicationBootstrap() {
    if (process.env.NODE_ENV === "test") return;
    await this.ensureConfig();
    this.reconcileTimer = setInterval(() => void this.runDailyReconcileIfDue().catch((error) => this.logger.error(error)), 60_000);
  }

  onModuleDestroy() {
    if (this.reconcileTimer) clearInterval(this.reconcileTimer);
  }

  async listTargets() {
    const targets = await this.prisma.inventoryTarget.findMany({
      include: { article: true, location: true },
      orderBy: [{ article: { name: "asc" } }, { location: { name: "asc" } }]
    });
    const stock = await this.usableStockMap(new Date());
    const orderMap = await this.activeOrderMap();
    return targets.map((target) => {
      const key = targetKey(target.articleId, target.locationId);
      const currentQuantity = stock.get(key) ?? 0;
      return {
        id: target.id,
        articleId: target.articleId,
        locationId: target.locationId,
        targetQuantity: target.targetQuantity,
        currentQuantity,
        shortageQuantity: Math.max(target.targetQuantity - currentQuantity, 0),
        article: {
          id: target.article.id,
          name: target.article.name,
          unit: target.article.unit,
          articleUrl: target.article.articleUrl ?? undefined
        },
        location: { id: target.location.id, name: target.location.name },
        procurementOrder: orderMap.get(key)
      };
    });
  }

  async upsertTarget(articleId: string, locationId: string, targetQuantity: number) {
    const quantity = normalizePositiveInteger(targetQuantity, "Soll-Menge muss eine ganze Zahl größer 0 sein.");
    await this.assertReferences(articleId, locationId);
    await this.prisma.inventoryTarget.upsert({
      where: { articleId_locationId: { articleId, locationId } },
      update: { targetQuantity: quantity },
      create: { articleId, locationId, targetQuantity: quantity }
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Lagerteam",
      action: "INVENTORY_TARGET_UPDATED",
      entityType: "InventoryTarget",
      entityId: `${articleId}:${locationId}`,
      payload: { articleId, locationId, targetQuantity: quantity }
    });
    return (await this.listTargets()).find((target) => target.articleId === articleId && target.locationId === locationId);
  }

  async clearTarget(articleId: string, locationId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.inventoryTarget.deleteMany({ where: { articleId, locationId } });
      await tx.inventoryProcurementOrder.updateMany({
        where: { articleId, locationId, status: InventoryProcurementStatus.OPEN },
        data: { activeKey: null, status: InventoryProcurementStatus.CANCELLED }
      });
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Lagerteam",
      action: "INVENTORY_TARGET_CLEARED",
      entityType: "InventoryTarget",
      entityId: `${articleId}:${locationId}`,
      payload: { articleId, locationId }
    });
    return { ok: true as const };
  }

  async listProcurementOrders() {
    const orders = await this.prisma.inventoryProcurementOrder.findMany({
      include: { article: true, location: true, receipts: { orderBy: { createdAt: "asc" } } },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
    });
    return orders.map((order) => mapProcurementOrder(order));
  }

  async reconcile(reason = "manual") {
    return this.withReconcileLock(async () => this.reconcileTargets(reason));
  }

  private async reconcileTargets(reason = "manual") {
    const now = new Date();
    const targets = await this.prisma.inventoryTarget.findMany({ include: { article: true } });
    const stock = await this.usableStockMap(now);
    const activeOrders = await this.prisma.inventoryProcurementOrder.findMany({
      where: { status: { in: activeOrderStatuses } },
      orderBy: { createdAt: "asc" }
    });
    const ordersByKey = groupOrdersByKey(activeOrders);
    const summary = { checked: targets.length, created: 0, updated: 0, cancelled: 0 };

    for (const target of targets) {
      const key = targetKey(target.articleId, target.locationId);
      const usableQuantity = stock.get(key) ?? 0;
      const deficit = Math.max(target.targetQuantity - usableQuantity, 0);
      const orders = ordersByKey.get(key) ?? [];
      const inProgress = orders.find((order) => order.status === InventoryProcurementStatus.IN_PROGRESS);
      const openOrders = orders.filter((order) => order.status === InventoryProcurementStatus.OPEN);
      const open = openOrders[0];

      for (const duplicate of openOrders.slice(1)) {
        await this.prisma.inventoryProcurementOrder.update({
          where: { id: duplicate.id },
          data: { activeKey: null, status: InventoryProcurementStatus.CANCELLED }
        });
        summary.cancelled += 1;
      }
      if (inProgress) continue;

      if (deficit === 0 && open) {
        await this.prisma.inventoryProcurementOrder.update({
          where: { id: open.id },
          data: { activeKey: null, status: InventoryProcurementStatus.CANCELLED }
        });
        summary.cancelled += 1;
        continue;
      }
      if (deficit > 0 && open && open.requestedQuantity !== deficit) {
        await this.prisma.inventoryProcurementOrder.update({
          where: { id: open.id },
          data: { requestedQuantity: deficit }
        });
        summary.updated += 1;
        continue;
      }
      if (deficit > 0 && !open) {
        await this.prisma.inventoryProcurementOrder.create({
          data: {
            articleId: target.articleId,
            locationId: target.locationId,
            activeKey: key,
            requestedQuantity: deficit,
            articleUrlSnapshot: target.article.articleUrl
          }
        });
        summary.created += 1;
      }
    }

    await this.prisma.inventoryAutomationConfig.upsert({
      where: { id: configId },
      update: { lastReconciledAt: now },
      create: { id: configId, lastReconciledAt: now }
    });
    await this.audit.record({
      actorType: reason === "schedule" ? "SYSTEM" : "USER",
      actorLabel: reason === "schedule" ? "RescueBase" : "Lagerteam",
      action: "INVENTORY_TARGETS_RECONCILED",
      entityType: "InventoryTarget",
      entityId: configId,
      payload: summary
    });
    return summary;
  }

  async startOrder(id: string) {
    const order = await this.findOrder(id);
    if (order.status !== InventoryProcurementStatus.OPEN) {
      throw new BadRequestException("Nur offene Beschaffungsaufträge können gestartet werden.");
    }
    const updated = await this.prisma.inventoryProcurementOrder.update({
      where: { id },
      data: { status: InventoryProcurementStatus.IN_PROGRESS },
      include: { article: true, location: true, receipts: true }
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Lagerteam",
      action: "INVENTORY_PROCUREMENT_STARTED",
      entityType: "InventoryProcurementOrder",
      entityId: id,
      payload: { requestedQuantity: updated.requestedQuantity }
    });
    return mapProcurementOrder(updated);
  }

  async cancelOrder(id: string) {
    const order = await this.findOrder(id);
    if (order.status === InventoryProcurementStatus.DONE) {
      throw new BadRequestException("Abgeschlossene Beschaffungsaufträge können nicht storniert werden.");
    }
    const updated = await this.prisma.inventoryProcurementOrder.update({
      where: { id },
      data: { activeKey: null, status: InventoryProcurementStatus.CANCELLED },
      include: { article: true, location: true, receipts: true }
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Lagerteam",
      action: "INVENTORY_PROCUREMENT_CANCELLED",
      entityType: "InventoryProcurementOrder",
      entityId: id,
      payload: { status: order.status }
    });
    return mapProcurementOrder(updated);
  }

  async receiveOrder(id: string, body: { items: Array<{ lotNumber: string; expiresAt: string; quantity: number }>; verified: boolean }) {
    const order = await this.findOrder(id);
    if (order.status !== InventoryProcurementStatus.IN_PROGRESS) {
      throw new BadRequestException("Wareneingang ist nur für Aufträge in Bearbeitung möglich.");
    }
    if (body.verified !== true) {
      throw new BadRequestException("Wareneingang muss vor dem Buchen geprüft und bestätigt werden.");
    }
    const items = normalizeReceiptItems(body.items);
    const total = items.reduce((sum, item) => sum + item.quantity, 0);
    const remaining = order.requestedQuantity - order.receivedQuantity;
    if (total > remaining) {
      throw new BadRequestException("Wareneingang überschreitet die offene Bestellmenge.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        const verifiedAt = new Date();
        const batch = await tx.batch.create({
          data: {
            articleId: order.articleId,
            locationId: order.locationId,
            lotNumber: item.lotNumber,
            expiresAt: item.expiresAt,
            quantity: item.quantity
          }
        });
        await tx.inventoryMovement.create({
          data: {
            batchId: batch.id,
            articleId: batch.articleId,
            locationId: batch.locationId,
            inventoryProcurementOrderId: order.id,
            type: "PROCUREMENT_RECEIPT",
            quantity: item.quantity,
            actorLabel: "Lagerteam",
            reason: "Wareneingang Beschaffungsauftrag",
            metadata: {
              lotNumber: item.lotNumber,
              expiresAt: toIsoDate(item.expiresAt)
            }
          }
        });
        await tx.inventoryProcurementReceipt.create({
          data: {
            orderId: order.id,
            batchId: batch.id,
            quantity: item.quantity,
            lotNumber: item.lotNumber,
            expiresAt: item.expiresAt,
            verifiedAt,
            verifiedBy: "Lagerteam"
          }
        });
      }
      const nextReceived = order.receivedQuantity + total;
      await tx.inventoryProcurementOrder.update({
        where: { id: order.id },
        data: {
          activeKey: nextReceived >= order.requestedQuantity ? null : order.activeKey,
          receivedQuantity: nextReceived,
          status: nextReceived >= order.requestedQuantity ? InventoryProcurementStatus.DONE : InventoryProcurementStatus.IN_PROGRESS
        }
      });
      await this.audit.recordInTransaction(tx, {
        actorType: "USER",
        actorLabel: "Lagerteam",
        action: "INVENTORY_PROCUREMENT_RECEIVED",
        entityType: "InventoryProcurementOrder",
        entityId: order.id,
        payload: { receivedQuantity: total }
      });
      return tx.inventoryProcurementOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: { article: true, location: true, receipts: { orderBy: { createdAt: "asc" } } }
      });
    });
    return mapProcurementOrder(updated);
  }

  async getAutomationConfig() {
    const config = await this.ensureConfig();
    return {
      enabled: config.enabled,
      dailyReconcileTime: config.dailyReconcileTime,
      lastReconciledAt: config.lastReconciledAt ? toIsoDateTime(config.lastReconciledAt) : null
    };
  }

  async updateAutomationConfig(body: { dailyReconcileTime: string }) {
    const dailyReconcileTime = normalizeTime(body.dailyReconcileTime);
    const config = await this.prisma.inventoryAutomationConfig.upsert({
      where: { id: configId },
      update: { dailyReconcileTime },
      create: { id: configId, dailyReconcileTime }
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "INVENTORY_AUTOMATION_CONFIG_UPDATED",
      entityType: "InventoryAutomationConfig",
      entityId: configId,
      payload: { dailyReconcileTime }
    });
    return {
      enabled: config.enabled,
      dailyReconcileTime: config.dailyReconcileTime,
      lastReconciledAt: config.lastReconciledAt ? toIsoDateTime(config.lastReconciledAt) : null
    };
  }

  private async runDailyReconcileIfDue() {
    const [config, general] = await Promise.all([
      this.ensureConfig(),
      this.prisma.appSettings.upsert({ where: { id: configId }, update: {}, create: { id: configId, timezone: defaultTimezone() } })
    ]);
    const now = new Date();
    if (!config.enabled || !isScheduleDue(now, config.lastReconciledAt, config.dailyReconcileTime, general.timezone)) return;
    await this.reconcile("schedule");
  }

  private async ensureConfig() {
    return this.prisma.inventoryAutomationConfig.upsert({
      where: { id: configId },
      update: {},
      create: { id: configId }
    });
  }

  private async withReconcileLock<T>(callback: () => Promise<T>): Promise<T> {
    const [lock] = await this.prisma.$queryRaw<Array<{ acquired: number | bigint | null }>>`SELECT GET_LOCK('rescuebase_inventory_reconcile', 0) AS acquired`;
    if (Number(lock?.acquired ?? 0) !== 1) {
      throw new BadRequestException("Sollprüfung läuft bereits.");
    }
    try {
      return await callback();
    } finally {
      await this.prisma.$queryRaw`SELECT RELEASE_LOCK('rescuebase_inventory_reconcile')`;
    }
  }

  private async assertReferences(articleId: string, locationId: string) {
    const [article, location] = await Promise.all([
      this.prisma.article.findFirst({ where: { id: articleId, deletedAt: null } }),
      this.prisma.location.findFirst({ where: { id: locationId, deletedAt: null } })
    ]);
    if (!article) throw new BadRequestException("Artikel nicht gefunden.");
    if (!location) throw new BadRequestException("Lagerort nicht gefunden.");
  }

  private async findOrder(id: string): Promise<ProcurementOrderRecord> {
    const order = await this.prisma.inventoryProcurementOrder.findUnique({
      where: { id },
      include: { article: true, location: true, receipts: { orderBy: { createdAt: "asc" } } }
    });
    if (!order) throw new NotFoundException("Beschaffungsauftrag nicht gefunden.");
    return order;
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

  private async activeOrderMap() {
    const orders = await this.prisma.inventoryProcurementOrder.findMany({
      where: { status: { in: activeOrderStatuses } },
      include: { article: true, location: true, receipts: { orderBy: { createdAt: "asc" } } }
    });
    return new Map(orders.map((order) => [targetKey(order.articleId, order.locationId), mapProcurementOrder(order)]));
  }
}

function mapProcurementOrder(order: ProcurementOrderRecord) {
  return {
    id: order.id,
    articleId: order.articleId,
    locationId: order.locationId,
    status: order.status,
    requestedQuantity: order.requestedQuantity,
    receivedQuantity: order.receivedQuantity,
    remainingQuantity: Math.max(order.requestedQuantity - order.receivedQuantity, 0),
    articleUrlSnapshot: order.articleUrlSnapshot ?? undefined,
    createdAt: toIsoDateTime(order.createdAt),
    updatedAt: toIsoDateTime(order.updatedAt),
    article: {
      id: order.article.id,
      name: order.article.name,
      unit: order.article.unit,
      articleUrl: order.article.articleUrl ?? undefined
    },
    location: { id: order.location.id, name: order.location.name },
    receipts: order.receipts.map((receipt) => ({
      id: receipt.id,
      batchId: receipt.batchId,
      quantity: receipt.quantity,
      lotNumber: receipt.lotNumber,
      expiresAt: toIsoDate(receipt.expiresAt),
      verifiedAt: toIsoDateTime(receipt.verifiedAt),
      verifiedBy: receipt.verifiedBy,
      createdAt: toIsoDateTime(receipt.createdAt)
    }))
  };
}

function groupOrdersByKey<T extends { articleId: string; locationId: string }>(orders: T[]) {
  const groups = new Map<string, T[]>();
  for (const order of orders) {
    const key = targetKey(order.articleId, order.locationId);
    groups.set(key, [...(groups.get(key) ?? []), order]);
  }
  return groups;
}

function targetKey(articleId: string, locationId: string) {
  return `${articleId}:${locationId}`;
}

function normalizePositiveInteger(value: number, message: string) {
  const quantity = Math.trunc(value);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new BadRequestException(message);
  return quantity;
}

function normalizeReceiptItems(items: Array<{ lotNumber: string; expiresAt: string; quantity: number }> | undefined) {
  if (!items?.length) throw new BadRequestException("Mindestens eine Wareneingangsposition ist erforderlich.");
  return items.map((item) => {
    const quantity = normalizePositiveInteger(item.quantity, "Wareneingangsmenge muss eine ganze Zahl größer 0 sein.");
    const lotNumber = item.lotNumber?.trim();
    const expiresAt = new Date(item.expiresAt);
    if (!lotNumber) throw new BadRequestException("Chargennummer ist erforderlich.");
    if (Number.isNaN(expiresAt.getTime())) throw new BadRequestException("Ablaufdatum ist ungültig.");
    return { lotNumber, expiresAt, quantity };
  });
}

function normalizeTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new BadRequestException("Uhrzeit muss im Format HH:MM angegeben werden.");
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new BadRequestException("Uhrzeit ist ungültig.");
  return `${match[1]}:${match[2]}`;
}
