import { matchesFilterText } from "../../app/filter-utils";
import type { Article, UpdateArticleRequest } from "../../lib/types";

export type SupplierSummary = {
  articleCount: number;
  articleNames: string[];
  name: string;
};

export function buildSupplierSummaries(articles: Article[], query: string) {
  const groups = new Map<string, SupplierSummary>();
  for (const article of articles) {
    const name = normalizeSupplierName(article.defaultSupplierName);
    if (!name) continue;
    const current = groups.get(name) ?? { articleCount: 0, articleNames: [], name };
    current.articleCount += 1;
    current.articleNames.push(article.name);
    groups.set(name, current);
  }
  return [...groups.values()]
    .filter((entry) => matchesFilterText(query, entry.name, ...entry.articleNames))
    .map((entry) => ({ ...entry, articleNames: entry.articleNames.sort((left, right) => left.localeCompare(right, "de-DE")) }))
    .sort((left, right) => left.name.localeCompare(right.name, "de-DE"));
}

export function buildSupplierUpdate(article: Article, defaultSupplierName?: string): UpdateArticleRequest {
  return {
    name: article.name,
    unit: article.unit,
    manufacturer: article.manufacturer,
    manufacturerPartNumber: article.manufacturerPartNumber,
    category: article.category,
    barcode: article.barcode,
    articleUrl: article.articleUrl,
    defaultSupplierName,
    unitsPerPackage: article.unitsPerPackage,
    defaultGrossPriceCents: article.defaultGrossPriceCents,
    sterile: article.sterile,
    medicalDevice: article.medicalDevice,
    stkRequired: article.stkRequired,
    stkIntervalMonths: article.stkIntervalMonths,
    mtkRequired: article.mtkRequired,
    mtkIntervalMonths: article.mtkIntervalMonths,
    storageNotes: article.storageNotes,
    notes: article.notes,
    criticalDefault: article.criticalDefault,
  };
}

export function normalizeSupplierName(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : "";
}

export function summarizeArticleNames(articleNames: string[]) {
  if (articleNames.length <= 3) return articleNames.join(", ");
  return `${articleNames.slice(0, 3).join(", ")} +${articleNames.length - 3} weitere`;
}
