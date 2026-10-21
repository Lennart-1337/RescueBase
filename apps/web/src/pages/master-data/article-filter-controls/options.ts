import type { Article, Supplier } from "../../../lib/types";
export const missingOptions = [
  { value: "category", label: "Kategorie" }, { value: "manufacturer", label: "Hersteller" },
  { value: "barcode", label: "Barcode" }, { value: "articleNumber", label: "Artikelnummer" },
  { value: "supplier", label: "Standard-Lieferant" }, { value: "price", label: "Preis" },
  { value: "articleUrl", label: "Artikel-Link" },
].map((option) => ({ ...option, label: `${option.label} fehlt` }));
export const flagOptions = [
  { key: "medicalDevice", label: "MPDG" }, { key: "stkRequired", label: "STK" },
  { key: "mtkRequired", label: "MTK" }, { key: "criticalDefault", label: "Kritisch" },
  { key: "sterile", label: "Sterilität" },
] as const;
export function articleOptions(articles: Article[], suppliers: Supplier[]) {
  const values = (key: "category" | "manufacturer" | "unit") => [...new Set(articles.map((article) => article[key]).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "de")).map((value) => ({ label: value, value }));
  return {
    category: values("category"), manufacturer: values("manufacturer"), unit: values("unit"),
    supplier: [{ label: "Ohne Zuordnung", value: "__none__" }, ...suppliers.map((supplier) => ({ label: supplier.name, value: supplier.id })).sort((a, b) => a.label.localeCompare(b.label, "de"))],
    missing: missingOptions,
  };
}
export const arrayValue = (value: string | string[] | undefined) => Array.isArray(value) ? value : value ? [value] : [];
