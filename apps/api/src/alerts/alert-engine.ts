const warningWindowDays = 90;

export type AlertCategory = "EXPIRY" | "STK_DUE" | "MTK_DUE" | "SHORTAGE" | "KIT_CHECK_DUE";
export type AlertSource = "BATCH" | "MEDICAL_DEVICE" | "INVENTORY_TARGET" | "KIT";

export type AlertWarning = {
  category: AlertCategory;
  sourceType: AlertSource;
  sourceId: string;
  locationId: string | null;
  locationName: string | null;
  title: string;
  details: string;
  dueAt: string;
  metadata: Record<string, unknown>;
};

type BatchInput = {
  id: string;
  articleId: string;
  articleName: string;
  locationId: string;
  locationName: string;
  lotNumber: string;
  expiresAt: Date;
  quantity: number;
};

type DeviceInput = {
  id: string;
  articleId: string;
  articleName: string;
  locationId: string;
  locationName: string;
  name: string;
  serialNumber: string | null;
  inventoryNumber: string | null;
  lastStkAt: Date | null;
  lastMtkAt: Date | null;
  stkIntervalMonths: number | null;
  mtkIntervalMonths: number | null;
  article: {
    stkRequired: boolean;
    mtkRequired: boolean;
    stkIntervalMonths: number | null;
    mtkIntervalMonths: number | null;
  };
};

type TargetInput = {
  id: string;
  articleId: string;
  articleName: string;
  locationId: string;
  locationName: string;
  targetQuantity: number;
  currentQuantity: number;
  shortageQuantity: number;
  unit: string;
};

type KitInput = {
  id: string;
  name: string;
  code: string;
  locationId: string;
  locationName: string;
  createdAt: Date;
  lastCheckedAt: Date | null;
};

export function buildAlertWarnings(input: { batches: BatchInput[]; devices: DeviceInput[]; targets?: TargetInput[]; kits?: KitInput[]; kitCheckSchedule?: { enabled: boolean; intervalMonths: number; warningLeadDays: number } }, now = new Date(), alertDays = warningWindowDays): AlertWarning[] {
  return [
    ...input.batches.flatMap((batch) => buildBatchWarnings(batch, now, alertDays)),
    ...input.devices.flatMap((device) => buildDeviceWarnings(device, now, alertDays)),
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

export function computeControlDueDate(lastControlAt: Date | null, intervalMonths: number, now = new Date()): string {
  if (!lastControlAt) {
    return now.toISOString();
  }
  return addMonths(lastControlAt, intervalMonths).toISOString();
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

function buildDeviceWarnings(device: DeviceInput, now: Date, alertDays: number): AlertWarning[] {
  const warnings: AlertWarning[] = [];
  if (device.article.stkRequired) {
    const interval = device.stkIntervalMonths ?? device.article.stkIntervalMonths;
    if (interval) {
      const dueAt = device.lastStkAt ? addMonths(device.lastStkAt, interval) : now;
      if (daysBetween(now, dueAt) <= alertDays) {
        warnings.push(deviceWarning(device, "STK_DUE", "STK fällig", dueAt, {
          lastControlAt: device.lastStkAt?.toISOString() ?? null,
          intervalMonths: interval
        }));
      }
    }
  }
  if (device.article.mtkRequired) {
    const interval = device.mtkIntervalMonths ?? device.article.mtkIntervalMonths;
    if (interval) {
      const dueAt = device.lastMtkAt ? addMonths(device.lastMtkAt, interval) : now;
      if (daysBetween(now, dueAt) <= alertDays) {
        warnings.push(deviceWarning(device, "MTK_DUE", "MTK fällig", dueAt, {
          lastControlAt: device.lastMtkAt?.toISOString() ?? null,
          intervalMonths: interval
        }));
      }
    }
  }
  return warnings;
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

function deviceWarning(device: DeviceInput, category: AlertCategory, titlePrefix: string, dueAt: Date, metadata: Record<string, unknown>): AlertWarning {
  return {
    category,
    sourceType: "MEDICAL_DEVICE",
    sourceId: device.id,
    locationId: device.locationId,
    locationName: device.locationName,
    title: `${titlePrefix}: ${device.name}`,
    details: `${device.name}${device.serialNumber ? ` · S/N ${device.serialNumber}` : ""}${device.inventoryNumber ? ` · Inv. ${device.inventoryNumber}` : ""} ist am ${dueAt.toISOString().slice(0, 10)} fällig.`,
    dueAt: dueAt.toISOString(),
    metadata: {
      articleId: device.articleId,
      deviceName: device.name,
      ...metadata
    }
  };
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
