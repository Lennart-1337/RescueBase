import { parseCents } from "../../purchase-orders/format";
export type ArticleDraft = {
  importOnOpen?: boolean;
  isOpen: boolean;
  editingId: string | null;
  name: string;
  shortName: string;
  unit: string;
  manufacturer: string;
  manufacturerPartNumber: string;
  supplierArticleNumber: string;
  category: string;
  barcode: string;
  articleUrl: string;
  defaultSupplierId: string;
  unitsPerPackage: string;
  defaultGrossPrice: string;
  sterile: boolean;
  medicalDevice: boolean;
  stkRequired: boolean;
  stkIntervalMonths: string;
  mtkRequired: boolean;
  mtkIntervalMonths: string;
  storageNotes: string;
  notes: string;
  criticalDefault: boolean;
};

export function emptyDraft(): ArticleDraft {
  return {
    isOpen: false,
    editingId: null,
    name: "",
    shortName: "",
    unit: "Stück",
    manufacturer: "",
    manufacturerPartNumber: "",
    supplierArticleNumber: "",
    category: "",
    barcode: "",
    articleUrl: "",
    defaultSupplierId: "",
    unitsPerPackage: "",
    defaultGrossPrice: "",
    sterile: false,
    medicalDevice: false,
    stkRequired: false,
    stkIntervalMonths: "",
    mtkRequired: false,
    mtkIntervalMonths: "",
    storageNotes: "",
    notes: "",
    criticalDefault: false,
  };
}

export function optionalText(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

export function intervalValue(required: boolean, value: string) {
  if (!required) return undefined;
  return Number.parseInt(value, 10);
}

export function optionalCents(value: string) {
  return value.trim() ? parseCents(value) : undefined;
}

export function optionalPositiveInteger(value: string) {
  const normalized = value.trim();
  return normalized ? Number.parseInt(normalized, 10) : undefined;
}

export function intervalsValid(draft: ArticleDraft) {
  return (
    (!draft.stkRequired ||
      (Number.isInteger(Number(draft.stkIntervalMonths)) &&
        Number(draft.stkIntervalMonths) > 0)) &&
    (!draft.mtkRequired ||
      (Number.isInteger(Number(draft.mtkIntervalMonths)) &&
        Number(draft.mtkIntervalMonths) > 0))
  );
}

export function unitsPerPackageValid(value: string) {
  return (
    value.trim() === "" ||
    (Number.isInteger(Number(value)) && Number(value) > 0)
  );
}
