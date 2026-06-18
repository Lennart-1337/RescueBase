export type TemplateRecord = {
  id: string;
  name: string;
  version: number;
  positions: Array<{
    id: string;
    articleId: string;
    moduleName: string | null;
    requiredQuantity: number;
    critical: boolean;
    article: { name: string; unit: string };
  }>;
};

export type KitRecord = {
  id: string;
  name: string;
  code: string;
  locationId: string;
  templateId: string;
  status: string;
  publicToken: string;
  tokenRotatedAt: Date;
  location: { id: string; name: string };
  template: TemplateRecord;
};

export type BatchRecord = {
  id: string;
  articleId: string;
  locationId: string;
  lotNumber: string;
  expiresAt: Date;
  quantity: number;
  article: { id: string; name: string; unit: string };
  location: { id: string; name: string };
};

export type OrderRecord = {
  id: string;
  kitId: string;
  checkId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  kit: { id: string; name: string; code: string; status: string; publicToken: string };
  items: Array<{
    articleId: string;
    articleName: string;
    templatePositionId: string;
    requestedQuantity: number;
    fulfilledQuantity: number;
    reason: string;
    unit: string;
    critical: boolean;
  }>;
};

export type MovementRecord = {
  id: string;
  batchId: string;
  articleId: string;
  locationId: string;
  replenishmentOrderId: string | null;
  inventoryProcurementOrderId: string | null;
  templatePositionId: string | null;
  type: string;
  quantity: number;
  actorLabel: string;
  reason: string | null;
  metadata: unknown;
  createdAt: Date;
};

export function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function toIsoDateTime(value: Date): string {
  return value.toISOString();
}

export function mapTemplate(template: TemplateRecord) {
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

export function mapKit(kit: KitRecord) {
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

export function mapBatch(batch: BatchRecord) {
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

export function mapOrder(order: OrderRecord) {
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
    inventoryProcurementOrderId: movement.inventoryProcurementOrderId ?? undefined,
    templatePositionId: movement.templatePositionId ?? undefined,
    type: movement.type,
    quantity: movement.quantity,
    actorLabel: movement.actorLabel,
    reason: movement.reason ?? undefined,
    metadata: movement.metadata ?? undefined,
    createdAt: toIsoDateTime(movement.createdAt)
  };
}
