import type {
  MeierArticleApplyRequest,
  MeierArticleValues,
} from "../../../lib/article-reconciliation";
export const labels = {
  name: "Name",
  unit: "Einheit",
  manufacturer: "Hersteller",
  manufacturerPartNumber: "Hersteller-Art.-Nr.",
  supplierArticleNumber: "Lieferanten-Art.-Nr.",
  barcode: "Barcode/DataMatrix",
  articleUrl: "Artikel-Link",
  unitsPerPackage: "VE",
  defaultGrossPriceCents: "Standardpreis brutto",
  medicalDevice: "Medizinprodukt (MPDG)",
};
export type ImportValues = MeierArticleApplyRequest["changes"];
export type Change = {
  key: keyof typeof labels;
  previous: string | number | boolean | null;
  next: string | number | boolean;
  selected: boolean;
};
export function isMeierArticle(article: { articleUrl?: string | null }) {
  try {
    const url = new URL(article.articleUrl ?? "");
    return (
      url.protocol === "https:" &&
      ["www.meier-medizintechnik.de", "meier-medizintechnik.de"].includes(
        url.hostname,
      ) &&
      !url.username &&
      !url.password &&
      !url.port &&
      /^\/[a-z0-9._-]+\/[a-z0-9._-]+\/?$/iu.test(url.pathname)
    );
  } catch {
    return false;
  }
}
export function changedFields(
  current: Partial<MeierArticleValues>,
  incoming: ImportValues,
): Change[] {
  return (Object.keys(labels) as (keyof typeof labels)[]).flatMap((key) => {
    const next = incoming[key];
    return next === undefined || next === current[key]
      ? []
      : [{ key, previous: current[key] ?? null, next, selected: false }];
  });
}
export function selectedChanges(changes: Change[]): ImportValues {
  return Object.fromEntries(
    changes
      .filter((entry) => entry.selected)
      .map((entry) => [entry.key, entry.next]),
  );
}
export function displayValue(key: Change["key"], value: Change["previous"]) {
  if (value === null) return "Nicht hinterlegt";
  if (typeof value === "boolean") return value ? "Ja" : "Nein";
  if (key === "defaultGrossPriceCents" && typeof value === "number")
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(value / 100);
  return String(value);
}
