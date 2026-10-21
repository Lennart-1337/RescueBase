import { matchesFilterText } from "../../../app/filter-utils";
import type { Article } from "../../../lib/types";
import type { ArticleFilters } from "../types";
import { booleanFields, choices } from "./search";
const absent = (value: string | null | undefined) => !value?.trim();
function missing(article: Article, key: string) {
  switch (key) {
    case "category": return absent(article.category);
    case "manufacturer": return absent(article.manufacturer);
    case "barcode": return absent(article.barcode);
    case "articleNumber": return absent(article.manufacturerPartNumber) && absent(article.supplierArticleNumber);
    case "supplier": return !article.defaultSupplierId;
    case "price": return article.defaultGrossPriceCents == null;
    case "articleUrl": return absent(article.articleUrl);
    default: return false;
  }
}
function inRange(value: number | null | undefined, min?: string, max?: string) {
  if (!min && !max) return true;
  if (value == null) return false;
  return (!min || value >= Number(min.replace(",", "."))) && (!max || value <= Number(max.replace(",", ".")));
}
export function matchesArticleFilters(article: Article, filters: ArticleFilters) {
  const selections: [string[], string][] = [
    [choices(filters.category), article.category ?? ""],
    [filters.manufacturer ?? [], article.manufacturer ?? ""],
    [filters.supplier ?? [], article.defaultSupplierId || "__none__"],
    [filters.unit ?? [], article.unit],
  ];
  if (selections.some(([selected, value]) => selected.length && !selected.includes(value))) return false;
  if (booleanFields.some((key) => typeof filters[key] === "boolean" && article[key] !== filters[key])) return false;
  if (filters.missing?.length && !filters.missing.some((key) => missing(article, key))) return false;
  if (filters.packageMissing ? article.unitsPerPackage != null : !inRange(article.unitsPerPackage, filters.packageMin, filters.packageMax)) return false;
  const hasPriceFilter = Boolean(filters.priceMin || filters.priceMax || filters.priceBasis);
  if (hasPriceFilter && article.defaultGrossPriceCents == null) return false;
  if (filters.priceBasis === "package" && !article.unitsPerPackage) return false;
  const packageSize = filters.priceBasis === "package" ? 1 : (article.unitsPerPackage || 1);
  const cents = article.defaultGrossPriceCents;
  const boundCents = (value: string) => {
    const [whole, fraction = ""] = value.replace(",", ".").split(".");
    return Number(`${whole}${fraction.padEnd(2, "0")}`) * packageSize;
  };
  if (cents != null && ((filters.priceMin && cents < boundCents(filters.priceMin)) || (filters.priceMax && cents > boundCents(filters.priceMax)))) return false;
  return matchesFilterText(filters.q, article.name, article.shortName, article.manufacturer, article.manufacturerPartNumber, article.supplierArticleNumber, article.barcode);
}
