import type { KitOperationalStatus, TemplatePosition } from "./types";

export interface CheckLineState {
  templatePositionId: string;
  countedQuantity: number;
  discardedExpiredQuantity: number;
  note: string;
}

export interface GroupedTemplatePosition {
  key: string;
  title: string;
  positions: TemplatePosition[];
}

export function initialCheckLines(positions: TemplatePosition[]): CheckLineState[] {
  return positions.map((position) => ({
    templatePositionId: position.id,
    countedQuantity: position.requiredQuantity,
    discardedExpiredQuantity: 0,
    note: ""
  }));
}

export function groupTemplatePositions(positions: TemplatePosition[]): GroupedTemplatePosition[] {
  const groups = new Map<string, GroupedTemplatePosition>();
  positions.forEach((position) => {
    const normalizedName = position.moduleName?.trim();
    const key = normalizedName ? normalizedName.toLowerCase() : "ohne-modul";
    const title = normalizedName || "Ohne Modul";
    const group = groups.get(key) ?? { key, title, positions: [] };
    group.positions.push(position);
    groups.set(key, group);
  });
  return [...groups.values()];
}

export function summarizeCheck(
  positions: TemplatePosition[],
  lines: CheckLineState[],
  selectedStatus: KitOperationalStatus
): { missingCount: number; discardedCount: number; criticalMissing: boolean; warnings: string[]; requiresReason: boolean } {
  const linesById = new Map(lines.map((line) => [line.templatePositionId, line]));
  let missingCount = 0;
  let discardedCount = 0;
  let criticalMissing = false;

  positions.forEach((position) => {
    const line = linesById.get(position.id);
    const counted = line?.countedQuantity ?? 0;
    const discarded = line?.discardedExpiredQuantity ?? 0;
    const missing = Math.max(position.requiredQuantity - counted, 0);
    missingCount += missing;
    discardedCount += discarded;
    if (position.critical && missing > 0) {
      criticalMissing = true;
    }
  });

  const warnings: string[] = [];
  if (criticalMissing && selectedStatus !== "NOT_READY") {
    warnings.push("Kritische Fehlmenge: Status prüfen.");
  }
  if ((missingCount > 0 || discardedCount > 0) && selectedStatus === "READY") {
    warnings.push("Bereit trotz Fehlmenge oder Verwurf benötigt eine Begründung.");
  }

  return {
    missingCount,
    discardedCount,
    criticalMissing,
    warnings,
    requiresReason: warnings.length > 0 && selectedStatus === "READY"
  };
}
