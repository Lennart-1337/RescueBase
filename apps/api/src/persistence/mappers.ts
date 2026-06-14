import type { Prisma } from "@prisma/client";

type TemplateWithPositions = Prisma.KitTemplateGetPayload<{
  include: { positions: { include: { article: true } } };
}>;

type KitWithRelations = Prisma.KitGetPayload<{
  include: {
    location: true;
    template: { include: { positions: { include: { article: true } } } };
  };
}>;

type BatchWithRelations = Prisma.BatchGetPayload<{
  include: { article: true; location: true };
}>;

type OrderWithRelations = Prisma.ReplenishmentOrderGetPayload<{
  include: { items: true; kit: true };
}>;

type MovementRecord = Prisma.InventoryMovementGetPayload<Record<string, never>>;

export function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function toIsoDateTime(value: Date): string {
  return value.toISOString();
}

export function mapTemplate(template: TemplateWithPositions) {
  return {
    id: template.id,
    name: template.name,
    version: template.version,
    positions: template.positions.map((position) => ({
      id: position.id,
      articleId: position.articleId,
      articleName: position.article.name,
      moduleName: position.moduleName ?? undefined,
      requiredQuantity: position.requiredQuantity,
      unit: position.article.unit,
      critical: position.critical
    }))
  };
}

export function mapKit(kit: KitWithRelations) {
  return {
    id: kit.id,
    name: kit.name,
    code: kit.code,
    locationId: kit.locationId,
    templateId: kit.templateId,
    status: kit.status,
    publicToken: kit.publicToken,
    tokenRotatedAt: toIsoDateTime(kit.tokenRotatedAt),
    location: { id: kit.location.id, name: kit.location.name },
    template: mapTemplate(kit.template)
  };
}

export function mapBatch(batch: BatchWithRelations) {
  return {
    id: batch.id,
    articleId: batch.articleId,
    locationId: batch.locationId,
    lotNumber: batch.lotNumber,
    expiresAt: toIsoDate(batch.expiresAt),
    quantity: batch.quantity,
    article: {
      id: batch.article.id,
      name: batch.article.name,
      unit: batch.article.unit
    },
    location: {
      id: batch.location.id,
      name: batch.location.name
    }
  };
}

export function mapOrder(order: OrderWithRelations) {
  return {
    id: order.id,
    kitId: order.kitId,
    checkId: order.checkId,
    status: order.status,
    createdAt: toIsoDateTime(order.createdAt),
    updatedAt: toIsoDateTime(order.updatedAt),
    kit: {
      id: order.kit.id,
      name: order.kit.name,
      code: order.kit.code,
      status: order.kit.status,
      publicToken: order.kit.publicToken
    },
    items: order.items.map((item) => ({
      articleId: item.articleId,
      articleName: item.articleName,
      templatePositionId: item.templatePositionId,
      requestedQuantity: item.requestedQuantity,
      fulfilledQuantity: item.fulfilledQuantity,
      reason: item.reason,
      unit: item.unit,
      critical: item.critical
    }))
  };
}

export function mapMovement(movement: MovementRecord) {
  return {
    id: movement.id,
    batchId: movement.batchId,
    articleId: movement.articleId,
    locationId: movement.locationId,
    replenishmentOrderId: movement.replenishmentOrderId ?? undefined,
    templatePositionId: movement.templatePositionId ?? undefined,
    type: movement.type,
    quantity: movement.quantity,
    actorLabel: movement.actorLabel,
    reason: movement.reason ?? undefined,
    metadata: movement.metadata ?? undefined,
    createdAt: toIsoDateTime(movement.createdAt)
  };
}
