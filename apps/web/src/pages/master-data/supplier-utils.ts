import { matchesFilterText } from "../../app/filter-utils";
import type { Article, Supplier } from "../../lib/types";

export type SupplierSummary = {
  articleCount: number;
  articleNames: string[];
  id: string;
  name: string;
};

export function buildSupplierSummaries(
  suppliers: Supplier[],
  articles: Article[],
  query: string,
) {
  return suppliers
    .map((supplier) => {
      const linkedArticles = articles
        .filter((article) => article.defaultSupplierId === supplier.id)
        .map((article) => article.name)
        .sort((left, right) => left.localeCompare(right, "de-DE"));
      return {
        articleCount: linkedArticles.length,
        articleNames: linkedArticles,
        id: supplier.id,
        name: supplier.name,
      };
    })
    .filter((supplier) =>
      matchesFilterText(query, supplier.name, ...supplier.articleNames),
    )
    .sort((left, right) => left.name.localeCompare(right.name, "de-DE"));
}

export function summarizeArticleNames(articleNames: string[]) {
  if (articleNames.length === 0) return "Noch keinem Artikel zugeordnet";
  if (articleNames.length <= 3) return articleNames.join(", ");
  return `${articleNames.slice(0, 3).join(", ")} +${articleNames.length - 3} weitere`;
}
