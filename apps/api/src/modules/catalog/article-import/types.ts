export type ArticleImportData = {
  name: string;
  articleUrl: string;
  unit?: string;
  manufacturer?: string;
  manufacturerPartNumber?: string;
  supplierArticleNumber?: string;
  barcode?: string;
  unitsPerPackage?: number;
  defaultGrossPriceCents?: number;
  medicalDevice?: boolean;
};
export type ArticleImportPreview = {
  source: "MEIER_MEDIZINTECHNIK";
  sourceUrl: string;
  fetchedAt: string;
  supplierName: "Meier Medizintechnik";
  data: ArticleImportData;
  warnings: string[];
};
