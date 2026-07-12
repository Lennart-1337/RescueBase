import { matchesFilterText } from "../../app/filter-utils";
import type { Article, Supplier } from "../../lib/types";

export type SupplierSummary = {
  articleCount: number;
  articleNames: string[];
  city?: string | null;
  contactPerson?: string | null;
  country?: string | null;
  email?: string | null;
  id: string;
  name: string;
  notes?: string | null;
  phone?: string | null;
  postalCode?: string | null;
  street?: string | null;
  website?: string | null;
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
        city: supplier.city,
        contactPerson: supplier.contactPerson,
        country: supplier.country,
        email: supplier.email,
        id: supplier.id,
        name: supplier.name,
        notes: supplier.notes,
        phone: supplier.phone,
        postalCode: supplier.postalCode,
        street: supplier.street,
        website: supplier.website,
      };
    })
    .filter((supplier) =>
      matchesFilterText(
        query,
        supplier.name,
        supplier.contactPerson,
        supplier.email,
        supplier.phone,
        supplier.website,
        supplier.street,
        supplier.postalCode,
        supplier.city,
        supplier.country,
        supplier.notes,
        ...supplier.articleNames,
      ),
    )
    .sort((left, right) => left.name.localeCompare(right.name, "de-DE"));
}

export function summarizeArticleNames(articleNames: string[]) {
  if (articleNames.length === 0) return "Noch keinem Artikel zugeordnet";
  if (articleNames.length <= 3) return articleNames.join(", ");
  return `${articleNames.slice(0, 3).join(", ")} +${articleNames.length - 3} weitere`;
}
