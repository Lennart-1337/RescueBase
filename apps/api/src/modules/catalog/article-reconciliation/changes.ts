import { BadRequestException } from "@nestjs/common";
import { validateMeierUrl } from "../article-import/fetch.js";
import type { ArticleImportData } from "../article-import/types.js";

export const reconciliationFields = [
  "name",
  "unit",
  "articleUrl",
  "manufacturer",
  "manufacturerPartNumber",
  "supplierArticleNumber",
  "barcode",
  "unitsPerPackage",
  "defaultGrossPriceCents",
  "medicalDevice",
] as const;
export function validateReconciliationChanges(
  value: unknown,
): Partial<ArticleImportData> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw invalid();
  const changes: Record<string, string | number | boolean> = {};
  const entries = Object.entries(value);
  if (entries.length === 0) throw invalid();
  for (const [key, input] of entries) {
    if (!(reconciliationFields as readonly string[]).includes(key))
      throw invalid();
    if (key === "medicalDevice") {
      if (typeof input !== "boolean") throw invalid();
      changes[key] = input;
    } else if (["unitsPerPackage", "defaultGrossPriceCents"].includes(key)) {
      if (
        typeof input !== "number" ||
        !Number.isSafeInteger(input) ||
        input < (key === "unitsPerPackage" ? 1 : 0) ||
        input > 2_147_483_647
      )
        throw invalid();
      changes[key] = input;
    } else {
      if (
        typeof input !== "string" ||
        !input.trim() ||
        input.length > (key === "articleUrl" ? 2048 : 191)
      )
        throw invalid();
      changes[key] =
        key === "articleUrl"
          ? validateMeierUrl(input).toString()
          : input.trim();
    }
  }
  return changes;
}
export function validateVersion(value: unknown): Date {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
  )
    throw invalid();
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value)
    throw invalid();
  return date;
}
function invalid() {
  return new BadRequestException(
    "Ungültige Änderungen für den Meier-Abgleich.",
  );
}
