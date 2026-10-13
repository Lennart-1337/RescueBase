import type { AlertWarning, BatchInput, TargetInput, KitInput } from "./alert-types.js";
export type { AlertCategory, AlertSource, AlertWarning } from "./alert-types.js";

const warningWindowDays = 90;

export function buildAlertWarnings(input: { batches: BatchInput[]; targets?: TargetInput[]; kits?: KitInput[]; kitCheckSchedule?: { enabled: boolean; intervalMonths: number; warningLeadDays: number } }, now = new Date(), alertDays = warningWindowDays): AlertWarning[] {
  return [
    ...input.batches.flatMap((batch) => buildBatchWarnings(batch, now, alertDays)),
    ...(input.targets ?? []).flatMap((target) => buildTargetWarnings(target, now)),
    ...(input.kitCheckSchedule?.enabled === false ? [] : (input.kits ?? []).flatMap((kit) => buildKitCheckWarnings(kit, now, input.kitCheckSchedule)))
  ];
}

function buildKitCheckWarnings(kit: KitInput, now: Date, schedule?: { intervalMonths: number; warningLeadDays: number }): AlertWarning[] {
  const dueAt = addMonths(kit.lastCheckedAt ?? kit.createdAt, schedule?.intervalMonths ?? 1);
  if (daysBetween(now, dueAt) > (schedule?.warningLeadDays ?? 0)) return [];
  return [{
    category: "KIT_CHECK_DUE",
    sourceType: "KIT",
    sourceId: kit.id,
    locationId: kit.locationId,
    locationName: kit.locationName,
    title: `Rucksackprüfung überfällig: ${kit.name}`,
    details: `${kit.name} (${kit.code}) hätte bis zum ${dueAt.toISOString().slice(0, 10)} geprüft werden müssen.`,
    dueAt: dueAt.toISOString(),
    metadata: { kitCode: kit.code, lastCheckedAt: kit.lastCheckedAt?.toISOString() ?? null }
  }];
}

function buildBatchWarnings(batch: BatchInput, now: Date, alertDays: number): AlertWarning[] {
  const daysUntilExpiry = daysBetween(now, batch.expiresAt);
  if (daysUntilExpiry > alertDays) {
    return [];
  }
  return [{
    category: "EXPIRY",
    sourceType: "BATCH",
    sourceId: batch.id,
    locationId: batch.locationId,
    locationName: batch.locationName,
    title: `Ablaufwarnung: ${batch.articleName}`,
    details: `${batch.quantity} ${batch.articleName} in Charge ${batch.lotNumber} laufen am ${batch.expiresAt.toISOString().slice(0, 10)} ab.`,
    dueAt: batch.expiresAt.toISOString(),
    metadata: {
      articleId: batch.articleId,
      lotNumber: batch.lotNumber,
      quantity: batch.quantity
    }
  }];
}

function buildTargetWarnings(target: TargetInput, now: Date): AlertWarning[] {
  if (target.shortageQuantity <= 0) return [];
  return [{
    category: "SHORTAGE",
    sourceType: "INVENTORY_TARGET",
    sourceId: target.id,
    locationId: target.locationId,
    locationName: target.locationName,
    title: `Sollbestand unterschritten: ${target.articleName}`,
    details: `${target.currentQuantity}/${target.targetQuantity} ${target.unit} verfügbar. Es fehlen ${target.shortageQuantity} ${target.unit}.`,
    dueAt: now.toISOString(),
    metadata: {
      articleId: target.articleId,
      targetQuantity: target.targetQuantity,
      currentQuantity: target.currentQuantity,
      shortageQuantity: target.shortageQuantity
    }
  }];
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const targetMonth = result.getUTCMonth() + months;
  const targetDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(targetMonth);
  const maxDay = daysInMonth(result.getUTCFullYear(), result.getUTCMonth());
  result.setUTCDate(Math.min(targetDay, maxDay));
  return result;
}

function daysBetween(from: Date, to: Date): number {
  const millisPerDay = 86_400_000;
  return Math.ceil((to.getTime() - from.getTime()) / millisPerDay);
}

function daysInMonth(year: number, monthZeroBased: number): number {
  return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate();
}
