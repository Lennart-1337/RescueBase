import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PurchaseOrderStatus } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.service.js";
import { PrismaService } from "../persistence/prisma.service.js";
import { toIsoDate, toIsoDateTime } from "../persistence/mappers.js";
import { AuditService } from "./audit.service.js";

type PurchaseOrderRecord = Awaited<ReturnType<PurchaseOrdersService["findOrderRecord"]>>;
type PurchaseOrderLineInput = {
  articleId: string;
  orderedQuantity: number;
  grossUnitPriceCents?: number;
  note?: string;
  supplierArticleNumber?: string;
};
type CreatePurchaseOrderBody = {
  supplierName: string;
  locationId: string;
  notes?: string;
  lines: PurchaseOrderLineInput[];
};
type UpdatePurchaseOrderBody = Partial<CreatePurchaseOrderBody> & {
  lineNotes?: Array<{ lineId: string; note?: string }>;
};
type ReceivePurchaseOrderBody = {
  lines: Array<{
    lineId: string;
    batches: Array<{ lotNumber: string; expiresAt: string; quantity: number }>;
  }>;
};
type ShortageBody = {
  locationId: string;
  groupingMode: "single" | "supplier";
  supplierName?: string;
  articleIds?: string[];
};

const orderInclude = {
  location: { select: { id: true, name: true } },
  lines: { orderBy: { createdAt: "asc" as const } },
  receipts: { orderBy: { createdAt: "asc" as const } }
};

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async list() {
    const orders = await this.prisma.purchaseOrder.findMany({
      include: orderInclude,
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
    });
    return orders.map(mapPurchaseOrder);
  }

  async get(id: string) {
    return mapPurchaseOrder(await this.findOrderRecord(id));
  }

  async archive(id: string) {
    const order = await this.findOrderRecord(id);
    if (order.archivedAt) return mapPurchaseOrder(order);
    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { archivedAt: new Date() },
      include: orderInclude
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Lagerteam",
      action: "PURCHASE_ORDER_ARCHIVED",
      entityType: "PurchaseOrder",
      entityId: id,
      payload: { orderNumber: updated.orderNumber }
    });
    return mapPurchaseOrder(updated);
  }

  async restore(id: string) {
    const order = await this.findOrderRecord(id);
    if (!order.archivedAt) return mapPurchaseOrder(order);
    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { archivedAt: null },
      include: orderInclude
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Lagerteam",
      action: "PURCHASE_ORDER_RESTORED",
      entityType: "PurchaseOrder",
      entityId: id,
      payload: { orderNumber: updated.orderNumber }
    });
    return mapPurchaseOrder(updated);
  }

  async createDraft(body: CreatePurchaseOrderBody) {
    const payload = await this.normalizeDraftPayload(body);
    const order = await this.prisma.purchaseOrder.create({
      data: {
        orderNumber: await this.nextOrderNumber(),
        supplierName: payload.supplierName,
        locationId: payload.locationId,
        notes: payload.notes,
        lines: { create: payload.lines }
      },
      include: orderInclude
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Lagerteam",
      action: "PURCHASE_ORDER_CREATED",
      entityType: "PurchaseOrder",
      entityId: order.id,
      payload: { orderNumber: order.orderNumber, lines: order.lines.length }
    });
    return mapPurchaseOrder(order);
  }

  async createFromShortages(body: ShortageBody) {
    const shortages = await this.shortages(body.locationId, body.articleIds);
    if (shortages.length === 0) throw new BadRequestException("Für diese Auswahl gibt es keine offenen Fehlmengen.");
    const groups = body.groupingMode === "supplier"
      ? groupBy(shortages, (entry) => entry.article.defaultSupplierName ?? "Ohne Lieferant")
      : new Map([[normalizeRequiredText(body.supplierName, "Lieferant ist erforderlich."), shortages]]);

    const orders = [];
    for (const [supplierName, entries] of groups) {
      orders.push(await this.createDraft({
        supplierName,
        locationId: body.locationId,
        lines: entries.map((entry) => ({
          articleId: entry.articleId,
          orderedQuantity: entry.shortageQuantity
        }))
      }));
    }
    return orders;
  }

  async update(id: string, body: UpdatePurchaseOrderBody) {
    const order = await this.findOrderRecord(id);
    if (order.status === PurchaseOrderStatus.DRAFT) {
      return this.updateDraft(order.id, body);
    }
    return this.updateApprovedFields(order, body);
  }

  async approve(id: string, user: AuthenticatedUser) {
    const order = await this.findOrderRecord(id);
    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException("Nur Entwürfe können freigegeben werden.");
    }
    if (order.lines.length === 0) throw new BadRequestException("Eine Bestellung benötigt mindestens eine Position.");
    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        approvedAt: new Date(),
        approvedByUserId: user.id,
        approvedByName: user.displayName,
        status: PurchaseOrderStatus.APPROVED
      },
      include: orderInclude
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: user.displayName,
      action: "PURCHASE_ORDER_APPROVED",
      entityType: "PurchaseOrder",
      entityId: id,
      payload: { orderNumber: updated.orderNumber }
    });
    return mapPurchaseOrder(updated);
  }

  async markOrdered(id: string) {
    const order = await this.findOrderRecord(id);
    if (order.status !== PurchaseOrderStatus.APPROVED) {
      throw new BadRequestException("Bestellungen müssen vor dem Bestellen freigegeben werden.");
    }
    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { orderedAt: new Date(), status: PurchaseOrderStatus.ORDERED },
      include: orderInclude
    });
    return mapPurchaseOrder(updated);
  }

  async receive(id: string, body: ReceivePurchaseOrderBody) {
    const order = await this.findOrderRecord(id);
    if (order.status !== PurchaseOrderStatus.ORDERED && order.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED) {
      throw new BadRequestException("Wareneingang ist nur für bestellte Bestellungen möglich.");
    }
    const normalized = normalizeReceiptBody(body, order.lines);
    const updated = await this.prisma.$transaction(async (tx) => {
      for (const entry of normalized) {
        const line = order.lines.find((item) => item.id === entry.lineId);
        if (!line) throw new BadRequestException("Bestellposition nicht gefunden.");
        for (const batchItem of entry.batches) {
          const receivedAt = new Date();
          const batch = await tx.batch.create({
            data: {
              articleId: line.articleId,
              locationId: order.locationId,
              lotNumber: batchItem.lotNumber,
              expiresAt: batchItem.expiresAt,
              quantity: batchItem.quantity
            }
          });
          await tx.inventoryMovement.create({
            data: {
              batchId: batch.id,
              articleId: batch.articleId,
              locationId: batch.locationId,
              purchaseOrderId: order.id,
              type: "PURCHASE_ORDER_RECEIPT",
              quantity: batchItem.quantity,
              actorLabel: "Lagerteam",
              reason: "Wareneingang Bestellung",
              metadata: { lotNumber: batchItem.lotNumber, expiresAt: toIsoDate(batchItem.expiresAt) }
            }
          });
          await tx.purchaseOrderReceipt.create({
            data: {
              orderId: order.id,
              lineId: entry.lineId,
              batchId: batch.id,
              quantity: batchItem.quantity,
              lotNumber: batchItem.lotNumber,
              expiresAt: batchItem.expiresAt,
              receivedAt,
              receivedBy: "Lagerteam"
            }
          });
        }
        await tx.purchaseOrderLine.update({
          where: { id: entry.lineId },
          data: { receivedQuantity: { increment: entry.totalQuantity } }
        });
      }

      const lines = await tx.purchaseOrderLine.findMany({ where: { orderId: order.id } });
      const nextStatus = lines.every((line) => line.receivedQuantity >= line.orderedQuantity)
        ? PurchaseOrderStatus.RECEIVED
        : PurchaseOrderStatus.PARTIALLY_RECEIVED;
      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: { status: nextStatus, receivedAt: nextStatus === PurchaseOrderStatus.RECEIVED ? new Date() : order.receivedAt }
      });
      await this.audit.recordInTransaction(tx, {
        actorType: "USER",
        actorLabel: "Lagerteam",
        action: "PURCHASE_ORDER_RECEIVED",
        entityType: "PurchaseOrder",
        entityId: order.id,
        payload: { lines: normalized.length }
      });
      return tx.purchaseOrder.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
    });
    return mapPurchaseOrder(updated);
  }

  private async updateDraft(id: string, body: UpdatePurchaseOrderBody) {
    const payload = body.lines ? await this.normalizeDraftPayload(body as CreatePurchaseOrderBody) : null;
    const order = await this.prisma.$transaction(async (tx) => {
      if (payload?.lines) {
        await tx.purchaseOrderLine.deleteMany({ where: { orderId: id } });
      }
      await tx.purchaseOrder.update({
        where: { id },
        data: {
          ...(payload ? {
            supplierName: payload.supplierName,
            locationId: payload.locationId,
            notes: payload.notes,
            lines: { create: payload.lines }
          } : {
            supplierName: optionalPatchText(body.supplierName),
            locationId: body.locationId ? await this.normalizeLocationId(body.locationId) : undefined,
            notes: optionalNullableText(body.notes)
          })
        }
      });
      return tx.purchaseOrder.findUniqueOrThrow({ where: { id }, include: orderInclude });
    });
    return mapPurchaseOrder(order);
  }

  private async updateApprovedFields(order: NonNullable<PurchaseOrderRecord>, body: UpdatePurchaseOrderBody) {
    const forbidden = body.locationId || body.lines?.length;
    if (forbidden) throw new BadRequestException("Nach Freigabe dürfen Positionen, Mengen, Preise und Zielort nicht mehr geändert werden.");
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: {
          supplierName: optionalPatchText(body.supplierName),
          notes: optionalNullableText(body.notes)
        }
      });
      for (const lineNote of body.lineNotes ?? []) {
        if (!order.lines.some((line) => line.id === lineNote.lineId)) {
          throw new BadRequestException("Bestellposition nicht gefunden.");
        }
        await tx.purchaseOrderLine.update({
          where: { id: lineNote.lineId },
          data: { note: optionalNullableText(lineNote.note) }
        });
      }
      return tx.purchaseOrder.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
    });
    return mapPurchaseOrder(updated);
  }

  private async normalizeDraftPayload(body: CreatePurchaseOrderBody) {
    const supplierName = normalizeRequiredText(body.supplierName, "Lieferant ist erforderlich.");
    const locationId = normalizeRequiredText(body.locationId, "Zielort ist erforderlich.");
    await this.normalizeLocationId(locationId);
    if (!body.lines?.length) throw new BadRequestException("Eine Bestellung benötigt mindestens eine Position.");
    const articles = await this.prisma.article.findMany({
      where: { id: { in: body.lines.map((line) => line.articleId) }, deletedAt: null }
    });
    const articleMap = new Map(articles.map((article) => [article.id, article]));
    const lines = body.lines.map((line) => {
      const article = articleMap.get(line.articleId);
      if (!article) throw new BadRequestException("Artikel nicht gefunden.");
      return {
        articleId: article.id,
        articleNameSnapshot: article.name,
        supplierArticleNumberSnapshot: optionalNullableText(line.supplierArticleNumber) ?? article.manufacturerPartNumber,
        articleUrlSnapshot: article.articleUrl,
        manufacturerPartNumberSnapshot: article.manufacturerPartNumber,
        unitSnapshot: article.unit,
        grossUnitPriceCents: normalizeNonNegativeInteger(line.grossUnitPriceCents ?? article.defaultGrossPriceCents ?? 0, "Preis muss eine ganze Cent-Zahl sein."),
        orderedQuantity: normalizePositiveInteger(line.orderedQuantity, "Bestellmenge muss eine ganze Zahl größer 0 sein."),
        note: optionalNullableText(line.note)
      };
    });
    return { supplierName, locationId, notes: optionalNullableText(body.notes), lines };
  }

  private async shortages(locationId: string, articleIds?: string[]) {
    const targets = await this.prisma.inventoryTarget.findMany({
      where: { locationId, ...(articleIds?.length ? { articleId: { in: articleIds } } : {}) },
      include: { article: true, location: true }
    });
    const now = new Date();
    const batches = await this.prisma.batch.findMany({
      where: { locationId, deletedAt: null, expiresAt: { gt: now }, quantity: { gt: 0 } }
    });
    const stock = new Map<string, number>();
    for (const batch of batches) stock.set(batch.articleId, (stock.get(batch.articleId) ?? 0) + batch.quantity);
    return targets
      .map((target) => ({ ...target, shortageQuantity: Math.max(target.targetQuantity - (stock.get(target.articleId) ?? 0), 0) }))
      .filter((target) => target.shortageQuantity > 0);
  }

  private async nextOrderNumber() {
    const year = new Date().getUTCFullYear();
    const count = await this.prisma.purchaseOrder.count({
      where: { orderNumber: { startsWith: `PO-${year}-` } }
    });
    return `PO-${year}-${String(count + 1).padStart(6, "0")}`;
  }

  private async findOrderRecord(id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: orderInclude });
    if (!order) throw new NotFoundException("Bestellung nicht gefunden.");
    return order;
  }

  private async normalizeLocationId(locationId: string) {
    const normalized = normalizeRequiredText(locationId, "Zielort ist erforderlich.");
    const location = await this.prisma.location.findFirst({ where: { id: normalized, deletedAt: null }, select: { id: true } });
    if (!location) throw new BadRequestException("Zielort nicht gefunden.");
    return normalized;
  }
}

function mapPurchaseOrder(order: NonNullable<PurchaseOrderRecord>) {
  const totalGrossCents = order.lines.reduce((sum, line) => sum + line.grossUnitPriceCents * line.orderedQuantity, 0);
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    supplierName: order.supplierName,
    locationId: order.locationId,
    status: order.status,
    notes: order.notes ?? undefined,
    archivedAt: order.archivedAt ? toIsoDateTime(order.archivedAt) : undefined,
    approvedAt: order.approvedAt ? toIsoDateTime(order.approvedAt) : undefined,
    approvedByName: order.approvedByName ?? undefined,
    orderedAt: order.orderedAt ? toIsoDateTime(order.orderedAt) : undefined,
    receivedAt: order.receivedAt ? toIsoDateTime(order.receivedAt) : undefined,
    totalGrossCents,
    createdAt: toIsoDateTime(order.createdAt),
    updatedAt: toIsoDateTime(order.updatedAt),
    location: order.location,
    lines: order.lines.map((line) => ({
      id: line.id,
      articleId: line.articleId,
      articleName: line.articleNameSnapshot,
      supplierArticleNumber: line.supplierArticleNumberSnapshot ?? undefined,
      articleUrl: line.articleUrlSnapshot ?? undefined,
      manufacturerPartNumber: line.manufacturerPartNumberSnapshot ?? undefined,
      unit: line.unitSnapshot,
      grossUnitPriceCents: line.grossUnitPriceCents,
      orderedQuantity: line.orderedQuantity,
      receivedQuantity: line.receivedQuantity,
      remainingQuantity: Math.max(line.orderedQuantity - line.receivedQuantity, 0),
      lineTotalGrossCents: line.grossUnitPriceCents * line.orderedQuantity,
      note: line.note ?? undefined
    })),
    receipts: order.receipts.map((receipt) => ({
      id: receipt.id,
      lineId: receipt.lineId,
      batchId: receipt.batchId,
      quantity: receipt.quantity,
      lotNumber: receipt.lotNumber,
      expiresAt: toIsoDate(receipt.expiresAt),
      receivedAt: toIsoDateTime(receipt.receivedAt),
      receivedBy: receipt.receivedBy,
      createdAt: toIsoDateTime(receipt.createdAt)
    }))
  };
}

function normalizeReceiptBody(body: ReceivePurchaseOrderBody, lines: NonNullable<PurchaseOrderRecord>["lines"]) {
  if (!body.lines?.length) throw new BadRequestException("Mindestens eine Wareneingangsposition ist erforderlich.");
  return body.lines.map((entry) => {
    const line = lines.find((item) => item.id === entry.lineId);
    if (!line) throw new BadRequestException("Bestellposition nicht gefunden.");
    if (!entry.batches?.length) throw new BadRequestException("Mindestens eine Charge ist erforderlich.");
    const batches = entry.batches.map((item) => {
      const lotNumber = normalizeRequiredText(item.lotNumber, "Chargennummer ist erforderlich.");
      const expiresAt = new Date(item.expiresAt);
      if (Number.isNaN(expiresAt.getTime())) throw new BadRequestException("Ablaufdatum ist ungültig.");
      return {
        lotNumber,
        expiresAt,
        quantity: normalizePositiveInteger(item.quantity, "Wareneingangsmenge muss eine ganze Zahl größer 0 sein.")
      };
    });
    const totalQuantity = batches.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQuantity > line.orderedQuantity - line.receivedQuantity) {
      throw new BadRequestException("Wareneingang überschreitet die offene Bestellmenge.");
    }
    return { lineId: entry.lineId, batches, totalQuantity };
  });
}

function groupBy<T>(items: T[], keyFor: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFor(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

function normalizeRequiredText(value: string | undefined, message: string) {
  const normalized = value?.trim();
  if (!normalized) throw new BadRequestException(message);
  return normalized;
}

function optionalPatchText(value: string | undefined) {
  return value === undefined ? undefined : normalizeRequiredText(value, "Feld darf nicht leer sein.");
}

function optionalNullableText(value: string | undefined) {
  if (value === undefined) return undefined;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizePositiveInteger(value: number, message: string) {
  const normalized = Math.trunc(Number(value));
  if (!Number.isFinite(normalized) || normalized <= 0) throw new BadRequestException(message);
  return normalized;
}

function normalizeNonNegativeInteger(value: number, message: string) {
  const normalized = Math.trunc(Number(value));
  if (!Number.isFinite(normalized) || normalized < 0) throw new BadRequestException(message);
  return normalized;
}
