import type { Article } from "../../lib/types";

export function supplierArticleNumberFor(article?: Article) {
  return article?.supplierArticleNumber?.trim() || article?.manufacturerPartNumber?.trim() || "";
}
