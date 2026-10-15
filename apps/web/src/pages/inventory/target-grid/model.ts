export type TargetChange = {
  articleId: string;
  targetQuantity: number;
  expectedTargetQuantity: number | null;
};
export type TargetBaseline = Record<string, number>;
export type TargetValues = Record<string, string>;

export function parseQuantity(raw: string): number {
  const value = raw.trim();
  if (!/^\d*$/.test(value) || Number(value) > 2_147_483_647) {
    throw new Error("Bitte eine ganze Zahl zwischen 0 und 2147483647 eingeben.");
  }
  return Number(value);
}

export function parseTabularPaste(text: string, availableRows: number): string[] {
  const rows = text.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n");
  if (rows.some((row) => row.includes("\t"))) throw new Error("Bitte nur eine Spalte mit Mindestmengen einfügen.");
  if (rows.length > availableRows) throw new Error("Die eingefügten Werte überschreiten die Anzahl der Artikel.");
  rows.forEach(parseQuantity);
  return rows;
}

export function getDirtyIds(ids: string[], baseline: TargetBaseline, values: TargetValues): string[] {
  return ids.filter((id) => {
    try { return parseQuantity(values[id] ?? "") !== (baseline[id] ?? 0); }
    catch { return true; }
  });
}

export function buildChanges(ids: string[], baseline: TargetBaseline, values: TargetValues): TargetChange[] {
  return getDirtyIds(ids, baseline, values).map((articleId) => ({
    articleId, targetQuantity: parseQuantity(values[articleId] ?? ""),
    expectedTargetQuantity: baseline[articleId] ?? null,
  }));
}

export function createValues(ids: string[], baseline: TargetBaseline): TargetValues {
  return Object.fromEntries(ids.map((id) => [id, String(baseline[id] ?? 0)]));
}
