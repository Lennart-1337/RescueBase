import { BadRequestException } from "@nestjs/common";

export type InventoryTargetChange = {
  articleId: string;
  targetQuantity: number;
  expectedTargetQuantity: number | null;
};
export type InventoryTargetBulkInput = { locationId: string; changes: InventoryTargetChange[] };

function isQuantity(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2147483647;
}
function isId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 191;
}
export function validateInventoryTargetBulk(value: unknown): InventoryTargetBulkInput {
  if (!value || typeof value !== "object") throw new BadRequestException("Lagerort und Änderungen sind erforderlich.");
  const input = value as Record<string, unknown>;
  if (!isId(input.locationId) || !Array.isArray(input.changes) || input.changes.length < 1 || input.changes.length > 5000) {
    throw new BadRequestException("Ein Lagerort und 1 bis 5000 Änderungen sind erforderlich.");
  }
  const ids = new Set<string>();
  const changes = input.changes.map((value: unknown) => {
    if (!value || typeof value !== "object") throw new BadRequestException("Ungültige Mindestbestandsänderung.");
    const change = value as Record<string, unknown>;
    if (!isId(change.articleId) || ids.has(change.articleId) || !isQuantity(change.targetQuantity) ||
      !(change.expectedTargetQuantity === null || isQuantity(change.expectedTargetQuantity))) {
      throw new BadRequestException("Artikel müssen eindeutig und Mengen ganze Zahlen zwischen 0 und 2147483647 sein. Der bisherige Mindestbestand ist erforderlich.");
    }
    ids.add(change.articleId);
    return { articleId: change.articleId, targetQuantity: change.targetQuantity, expectedTargetQuantity: change.expectedTargetQuantity };
  });
  return { locationId: input.locationId, changes };
}
