import type { Article } from "../../../lib/types";
import type { MeierSearchItem } from "../../../lib/article-search";
import { isMeierArticle } from "../article-reconciliation/changes";
function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s/]+/gu, "-");
}
function identifier(url: string) {
  try {
    return normalize(
      decodeURIComponent(
        new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? "",
      ),
    );
  } catch {
    return "";
  }
}
export function matchingArticles(articles: Article[], item: MeierSearchItem) {
  const keys = new Set(
    [identifier(item.url), normalize(item.supplierArticleNumber ?? "")].filter(
      Boolean,
    ),
  );
  return articles.filter((article) => {
    const trustedLink = isMeierArticle(article);
    const trustedSupplier = [
      "meiermedizintechnik",
      "meiermedizintechnikgmbh",
    ].includes(
      (article.defaultSupplierName ?? "").toLowerCase().replace(/[^a-z]/g, ""),
    );
    if (!trustedLink && !trustedSupplier) return false;
    return [
      trustedLink ? identifier(article.articleUrl ?? "") : "",
      normalize(article.supplierArticleNumber ?? ""),
    ].some((key) => key && keys.has(key));
  });
}
