import type { ArticleImportPreview } from "../../../lib/article-import";
import type { Supplier } from "../../../lib/types";
import { centsInput } from "../../purchase-orders/format";
import type { ArticleDraft } from "./draft";
export const labels = {
  name: "Name",
  unit: "Einheit",
  manufacturer: "Hersteller",
  manufacturerPartNumber: "Hersteller-Art.-Nr.",
  supplierArticleNumber: "Lieferanten-Art.-Nr.",
  barcode: "Barcode/DataMatrix",
  articleUrl: "Artikel-Link",
  unitsPerPackage: "VE",
  defaultGrossPrice: "Standardpreis brutto",
  medicalDevice: "Medizinprodukt (MPDG)",
  defaultSupplierId: "Standard-Lieferant",
};
export type Candidate = {
  key: keyof typeof labels;
  value: string | boolean;
  label: string;
  selected: boolean;
};
export function matchMeierSupplier(suppliers: Supplier[]) {
  const matches = suppliers.filter((supplier) => {
    let trusted = false;
    try {
      const host = new URL(supplier.website ?? "").hostname;
      trusted =
        host === "meier-medizintechnik.de" ||
        host === "www.meier-medizintechnik.de";
    } catch {
      /* suppliers may have no website */
    }
    return (
      trusted ||
      ["meiermedizintechnik", "meiermedizintechnikgmbh"].includes(
        supplier.name.toLowerCase().replace(/[^a-z]/g, ""),
      )
    );
  });
  return matches.length === 1 ? matches[0] : undefined;
}
export function importCandidates(
  preview: ArticleImportPreview,
  draft: ArticleDraft,
  suppliers: Supplier[],
): Candidate[] {
  const values: Partial<Record<keyof typeof labels, string | boolean>> = {};
  for (const key of [
    "name",
    "unit",
    "manufacturer",
    "manufacturerPartNumber",
    "supplierArticleNumber",
    "barcode",
    "articleUrl",
    "medicalDevice",
  ] as const) {
    const value = preview.data[key];
    if (value !== undefined) values[key] = value;
  }
  if (preview.data.unitsPerPackage !== undefined)
    values.unitsPerPackage = String(preview.data.unitsPerPackage);
  if (preview.data.defaultGrossPriceCents !== undefined)
    values.defaultGrossPrice = centsInput(preview.data.defaultGrossPriceCents);
  const supplier = matchMeierSupplier(suppliers);
  if (supplier) values.defaultSupplierId = supplier.id;
  return (Object.keys(values) as (keyof typeof labels)[]).map((key) => ({
    key,
    value: values[key]!,
    label: key === "defaultSupplierId" ? supplier!.name : String(values[key]),
    selected: draft[key] === "" || draft[key] === values[key],
  }));
}
export function mergeImport(
  current: ArticleDraft,
  loadedDraft: ArticleDraft,
  candidates: Candidate[],
): ArticleDraft {
  const patch: Partial<ArticleDraft> = {};
  for (const candidate of candidates)
    if (
      candidate.selected &&
      current[candidate.key] === loadedDraft[candidate.key]
    )
      Object.assign(patch, { [candidate.key]: candidate.value });
  return { ...current, ...patch };
}
