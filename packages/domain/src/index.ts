export type UserRole = "ADMIN" | "WAREHOUSE";
export type TwoFactorMethod = "TOTP" | "EMAIL";
export type KitOperationalStatus = "READY" | "CONDITIONAL" | "NOT_READY";
export type ReplenishmentStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";
export type AuditActorType = "SYSTEM" | "USER" | "PUBLIC_CHECKER";

export interface TemplatePosition {
  id: string;
  articleId: string;
  articleName: string;
  moduleName?: string;
  requiredQuantity: number;
  unit: string;
  critical: boolean;
}

export interface CheckPositionInput {
  templatePositionId: string;
  countedQuantity: number;
  discardedExpiredQuantity: number;
  note?: string;
}

export interface CheckCompletionInput {
  kitId: string;
  checkerName: string;
  signaturePngDataUrl: string;
  positions: CheckPositionInput[];
}

export interface EvaluatedCheckPosition {
  templatePositionId: string;
  articleId: string;
  articleName: string;
  moduleName?: string;
  unit: string;
  requiredQuantity: number;
  countedQuantity: number;
  discardedExpiredQuantity: number;
  missingQuantity: number;
  surplusQuantity: number;
  critical: boolean;
  hasShortage: boolean;
  needsReplenishment: boolean;
  note?: string;
}

export interface CheckEvaluation {
  kitId: string;
  checkerName: string;
  effectiveStatus: KitOperationalStatus;
  warnings: string[];
  positions: EvaluatedCheckPosition[];
  replenishmentItems: ReplenishmentDraftItem[];
}

export interface ReplenishmentDraftItem {
  articleId: string;
  articleName: string;
  templatePositionId: string;
  neededQuantity: number;
  reason: "SHORTAGE" | "DISCARDED_EXPIRED" | "SHORTAGE_AND_DISCARDED_EXPIRED";
  unit: string;
  critical: boolean;
}

export interface ReplenishmentItemState extends ReplenishmentDraftItem {
  requestedQuantity: number;
  fulfilledQuantity: number;
}

export interface ReplenishmentOrderState {
  id: string;
  status: ReplenishmentStatus;
  items: ReplenishmentItemState[];
}

export interface FulfillmentInput {
  itemId: string;
  quantity: number;
}

export interface FulfillmentResult {
  order: ReplenishmentOrderState;
  completed: boolean;
  remainingQuantity: number;
}

export function evaluateCheck(
  templatePositions: TemplatePosition[],
  input: CheckCompletionInput
): CheckEvaluation {
  assertNonEmpty(input.checkerName.trim(), "checkerName is required");
  assertNonEmpty(input.signaturePngDataUrl.trim(), "signature is required");

  const answersByPosition = new Map(input.positions.map((position) => [position.templatePositionId, position]));
  const positions = templatePositions.map((position) => {
    const answer = answersByPosition.get(position.id);
    const countedQuantity = normalizeQuantity(answer?.countedQuantity ?? 0, "countedQuantity");
    const discardedExpiredQuantity = normalizeQuantity(
      answer?.discardedExpiredQuantity ?? 0,
      "discardedExpiredQuantity"
    );
    const effectiveAvailable = countedQuantity;
    const missingQuantity = Math.max(position.requiredQuantity - effectiveAvailable, 0);
    const surplusQuantity = Math.max(effectiveAvailable - position.requiredQuantity, 0);

    return {
      templatePositionId: position.id,
      articleId: position.articleId,
      articleName: position.articleName,
      moduleName: position.moduleName,
      unit: position.unit,
      requiredQuantity: position.requiredQuantity,
      countedQuantity,
      discardedExpiredQuantity,
      missingQuantity,
      surplusQuantity,
      critical: position.critical,
      hasShortage: missingQuantity > 0,
      needsReplenishment: missingQuantity > 0 || discardedExpiredQuantity > 0,
      note: answer?.note
    } satisfies EvaluatedCheckPosition;
  });

  const effectiveStatus = deriveKitStatusFromPositions(positions);
  const warnings = buildIssueWarnings(positions);

  return {
    kitId: input.kitId,
    checkerName: input.checkerName.trim(),
    effectiveStatus,
    warnings,
    positions,
    replenishmentItems: positions.filter((position) => position.needsReplenishment).map(toReplenishmentDraft)
  };
}

export function applyFulfillment(
  order: ReplenishmentOrderState,
  fulfillments: FulfillmentInput[]
): FulfillmentResult {
  if (order.status === "DONE" || order.status === "CANCELLED") {
    throw new Error("Closed replenishment orders cannot be fulfilled.");
  }

  const fulfillmentMap = new Map(fulfillments.map((entry) => [entry.itemId, normalizeQuantity(entry.quantity, "quantity")]));
  let remainingQuantity = 0;

  const items = order.items.map((item) => {
    const addition = fulfillmentMap.get(item.templatePositionId) ?? 0;
    const maxAdditional = item.requestedQuantity - item.fulfilledQuantity;
    const fulfilledQuantity = item.fulfilledQuantity + Math.min(addition, maxAdditional);
    remainingQuantity += item.requestedQuantity - fulfilledQuantity;
    return { ...item, fulfilledQuantity };
  });

  const completed = remainingQuantity === 0;
  return {
    order: {
      ...order,
      status: completed ? "DONE" : "IN_PROGRESS",
      items
    },
    completed,
    remainingQuantity
  };
}

export function deriveKitStatusFromEvaluation(evaluation: CheckEvaluation): KitOperationalStatus {
  return deriveKitStatusFromPositions(evaluation.positions);
}

export function createSignatureHashPayload(input: CheckCompletionInput, evaluatedAtIso: string): string {
  return JSON.stringify({
    kitId: input.kitId,
    checkerName: input.checkerName.trim(),
    evaluatedAtIso,
    positions: input.positions
      .map((position) => ({
        templatePositionId: position.templatePositionId,
        countedQuantity: position.countedQuantity,
        discardedExpiredQuantity: position.discardedExpiredQuantity
      }))
      .sort((left, right) => left.templatePositionId.localeCompare(right.templatePositionId))
  });
}

function toReplenishmentDraft(position: EvaluatedCheckPosition): ReplenishmentDraftItem {
  const neededQuantity = position.missingQuantity + position.discardedExpiredQuantity;
  let reason: ReplenishmentDraftItem["reason"] = "SHORTAGE";

  if (position.missingQuantity > 0 && position.discardedExpiredQuantity > 0) {
    reason = "SHORTAGE_AND_DISCARDED_EXPIRED";
  } else if (position.discardedExpiredQuantity > 0) {
    reason = "DISCARDED_EXPIRED";
  }

  return {
    articleId: position.articleId,
    articleName: position.articleName,
    templatePositionId: position.templatePositionId,
    neededQuantity,
    reason,
    unit: position.unit,
    critical: position.critical
  };
}

function deriveKitStatusFromPositions(positions: EvaluatedCheckPosition[]): KitOperationalStatus {
  const hasCriticalShortage = positions.some((position) => position.critical && position.hasShortage);
  const hasAnyIssue = positions.some((position) => position.hasShortage || position.discardedExpiredQuantity > 0);

  if (hasCriticalShortage) {
    return "NOT_READY";
  }

  if (hasAnyIssue) {
    return "CONDITIONAL";
  }

  return "READY";
}

function buildIssueWarnings(positions: EvaluatedCheckPosition[]): string[] {
  const criticalShortages = positions.filter((position) => position.critical && position.hasShortage);
  const shortages = positions.filter((position) => position.hasShortage);
  const discarded = positions.filter((position) => position.discardedExpiredQuantity > 0);
  const warnings: string[] = [];

  if (criticalShortages.length > 0) {
    warnings.push("Mindestens eine kritische Position ist unvollständig.");
  }

  if (shortages.length > 0 && criticalShortages.length === 0) {
    warnings.push("Es fehlen Materialien, aber keine kritische Position.");
  }

  if (discarded.length > 0) {
    warnings.push("Abgelaufenes Material wurde verworfen und muss nachgefüllt werden.");
  }

  return warnings;
}

function normalizeQuantity(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a non-negative number.`);
  }

  return Math.trunc(value);
}

function assertNonEmpty(value: string, message: string): void {
  if (!value) {
    throw new Error(message);
  }
}
