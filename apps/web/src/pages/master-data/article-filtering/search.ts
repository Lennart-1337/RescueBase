import type { ArticleBooleanFilter, ArticleFilters } from "../types";
export const missingFields = ["category", "manufacturer", "barcode", "articleNumber", "supplier", "price", "articleUrl"];
export const booleanFields = ["medicalDevice", "stkRequired", "mtkRequired", "criticalDefault", "sterile"] as const;
export function choices(value: unknown): string[] {
  return [...new Set((Array.isArray(value) ? value : [value]).filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim())))];
}
function booleanChoice(value: unknown): ArticleBooleanFilter {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return "";
}
function numberChoice(value: unknown, integer = false) {
  if (typeof value === "number" && Number.isFinite(value)) value = String(value);
  if (typeof value !== "string" || !/^\d+(?:[.,]\d{0,2})?$/.test(value)) return "";
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) && (!integer || (Number.isInteger(number) && number >= 1)) ? value : "";
}
export function parseArticleFilters(search: Record<string, unknown>): ArticleFilters {
  return {
    q: typeof search.q === "string" ? search.q : "",
    category: choices(search.category), manufacturer: choices(search.manufacturer),
    supplier: choices(search.supplier), unit: choices(search.unit),
    missing: choices(search.missing).filter((field) => missingFields.includes(field)),
    medicalDevice: booleanChoice(search.medicalDevice), stkRequired: booleanChoice(search.stkRequired),
    mtkRequired: booleanChoice(search.mtkRequired), criticalDefault: booleanChoice(search.criticalDefault),
    sterile: booleanChoice(search.sterile),
    priceMin: numberChoice(search.priceMin), priceMax: numberChoice(search.priceMax),
    priceBasis: search.priceBasis === "package" || search.priceBasis === "unit" ? search.priceBasis : "",
    packageMin: numberChoice(search.packageMin, true), packageMax: numberChoice(search.packageMax, true),
    packageMissing: search.packageMissing === true || search.packageMissing === "true",
  };
}
export type ArticleFilterSearch = Partial<Omit<ArticleFilters, "category"> & { category: string[] }>;
export function serializeArticleFilters(filters: ArticleFilters): ArticleFilterSearch {
  const normalized = parseArticleFilters(filters);
  return Object.fromEntries(Object.entries(normalized).filter(([key, value]) => {
    if (booleanFields.includes(key as typeof booleanFields[number])) return value !== "";
    if (Array.isArray(value)) return value.length > 0;
    return value !== "" && value !== false;
  })) as ArticleFilterSearch;
}
