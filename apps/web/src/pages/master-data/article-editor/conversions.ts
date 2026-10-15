import type { Article } from "../../../lib/types";
import { centsInput } from "../../purchase-orders/format";
import {
  optionalText,
  optionalPositiveInteger,
  optionalCents,
  intervalValue,
  type ArticleDraft,
} from "./draft";
export function articleDraft(article: Article): ArticleDraft {
  return {
    isOpen: true,
    editingId: article.id,
    name: article.name,
    shortName: article.shortName ?? "",
    unit: article.unit,
    manufacturer: article.manufacturer ?? "",
    manufacturerPartNumber: article.manufacturerPartNumber ?? "",
    supplierArticleNumber: article.supplierArticleNumber ?? "",
    category: article.category ?? "",
    barcode: article.barcode ?? "",
    articleUrl: article.articleUrl ?? "",
    defaultSupplierId: article.defaultSupplierId ?? "",
    unitsPerPackage: article.unitsPerPackage?.toString() ?? "",
    defaultGrossPrice: centsInput(article.defaultGrossPriceCents),
    sterile: article.sterile,
    medicalDevice: article.medicalDevice ?? false,
    stkRequired: article.stkRequired ?? false,
    stkIntervalMonths: article.stkIntervalMonths?.toString() ?? "",
    mtkRequired: article.mtkRequired ?? false,
    mtkIntervalMonths: article.mtkIntervalMonths?.toString() ?? "",
    storageNotes: article.storageNotes ?? "",
    notes: article.notes ?? "",
    criticalDefault: article.criticalDefault,
  };
}
export function articleBody(draft: ArticleDraft) {
  return {
    name: draft.name,
    shortName: draft.shortName.trim(),
    unit: draft.unit,
    manufacturer: optionalText(draft.manufacturer),
    manufacturerPartNumber: optionalText(draft.manufacturerPartNumber),
    supplierArticleNumber: optionalText(draft.supplierArticleNumber),
    category: optionalText(draft.category),
    barcode: optionalText(draft.barcode),
    articleUrl: optionalText(draft.articleUrl),
    defaultSupplierId: optionalText(draft.defaultSupplierId),
    unitsPerPackage: optionalPositiveInteger(draft.unitsPerPackage),
    defaultGrossPriceCents: optionalCents(draft.defaultGrossPrice),
    sterile: draft.sterile,
    medicalDevice: draft.medicalDevice,
    stkRequired: draft.stkRequired,
    stkIntervalMonths: intervalValue(
      draft.stkRequired,
      draft.stkIntervalMonths,
    ),
    mtkRequired: draft.mtkRequired,
    mtkIntervalMonths: intervalValue(
      draft.mtkRequired,
      draft.mtkIntervalMonths,
    ),
    storageNotes: optionalText(draft.storageNotes),
    notes: optionalText(draft.notes),
    criticalDefault: draft.criticalDefault,
  };
}
