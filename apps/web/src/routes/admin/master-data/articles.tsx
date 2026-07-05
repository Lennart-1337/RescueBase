import { createFileRoute } from "@tanstack/react-router";
import { readBooleanSearch, readStringSearch, withPrunedSearch } from "../../../app/filter-utils";
import { preloadAdminQueries } from "../../../app/route-preload";
import { MasterDataArticlePage } from "../../../pages/master-data/article-page";
import { catalogQueries } from "../../../queries/catalog";

export type ArticleRouteSearch = {
  category?: string;
  criticalDefault?: true;
  medicalDevice?: true;
  mtkRequired?: true;
  q?: string;
  stkRequired?: true;
};

export const Route = createFileRoute("/admin/master-data/articles")({
  loader: ({ context }) =>
    preloadAdminQueries(context.queryClient, () =>
      Promise.all([
        context.queryClient.prefetchQuery(catalogQueries.articles())
      ])
    ),
  validateSearch: (search: Record<string, unknown>): ArticleRouteSearch =>
    withPrunedSearch({
      category: readStringSearch(search.category),
      criticalDefault: readBooleanSearch(search.criticalDefault) ? true : undefined,
      medicalDevice: readBooleanSearch(search.medicalDevice) ? true : undefined,
      mtkRequired: readBooleanSearch(search.mtkRequired) ? true : undefined,
      q: readStringSearch(search.q),
      stkRequired: readBooleanSearch(search.stkRequired) ? true : undefined
    }),
  component: MasterDataArticlesRoute
});

function MasterDataArticlesRoute() {
  const search = Route.useSearch();
  return <MasterDataArticlePage filters={{ category: search.category ?? "", criticalDefault: search.criticalDefault === true, medicalDevice: search.medicalDevice === true, mtkRequired: search.mtkRequired === true, q: search.q ?? "", stkRequired: search.stkRequired === true }} />;
}
