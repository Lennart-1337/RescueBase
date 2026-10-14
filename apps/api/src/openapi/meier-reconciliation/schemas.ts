import { objectSchema, ref } from "./helpers.js";

export const meierReconciliationSchemas = {
  MeierReconciliationCurrent: objectSchema(
    {
      name: { type: "string" },
      unit: { type: "string" },
      articleUrl: { type: "string", nullable: true },
      manufacturer: { type: "string", nullable: true },
      manufacturerPartNumber: { type: "string", nullable: true },
      supplierArticleNumber: { type: "string", nullable: true },
      barcode: { type: "string", nullable: true },
      unitsPerPackage: { type: "integer", nullable: true },
      defaultGrossPriceCents: { type: "integer", nullable: true },
      medicalDevice: { type: "boolean" },
    },
    [
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
    ],
  ),
  MeierReconciliationPreview: objectSchema(
    {
      articleId: { type: "string" },
      expectedUpdatedAt: { type: "string", format: "date-time" },
      current: ref("MeierReconciliationCurrent"),
      preview: ref("ArticleImportPreview"),
    },
    ["articleId", "expectedUpdatedAt", "current", "preview"],
  ),
  MeierReconciliationChanges: {
    ...objectSchema({
      name: { type: "string", minLength: 1, maxLength: 191 },
      unit: { type: "string", minLength: 1, maxLength: 191 },
      manufacturer: { type: "string", minLength: 1, maxLength: 191 },
      manufacturerPartNumber: { type: "string", minLength: 1, maxLength: 191 },
      supplierArticleNumber: { type: "string", minLength: 1, maxLength: 191 },
      barcode: { type: "string", minLength: 1, maxLength: 191 },
      articleUrl: { type: "string", format: "uri", maxLength: 2048 },
      unitsPerPackage: { type: "integer", minimum: 1, maximum: 2147483647 },
      defaultGrossPriceCents: {
        type: "integer",
        minimum: 0,
        maximum: 2147483647,
      },
      medicalDevice: { type: "boolean" },
    }),
    minProperties: 1,
  },
  MeierReconciliationApplyRequest: objectSchema(
    {
      expectedUpdatedAt: { type: "string", format: "date-time" },
      changes: ref("MeierReconciliationChanges"),
    },
    ["expectedUpdatedAt", "changes"],
  ),
};
