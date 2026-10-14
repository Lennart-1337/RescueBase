export interface MeierSearchItem {
  name: string;
  url: string;
  supplierArticleNumber?: string;
  manufacturer?: string;
  priceLabel?: string;
}
export interface MeierSearchResult {
  query: string;
  page: number;
  totalPages: number;
  items: MeierSearchItem[];
  warnings: string[];
}
