import { createFileRoute } from "@tanstack/react-router";
import { parseArticleFilters, serializeArticleFilters, type ArticleFilterSearch } from "../../../pages/master-data/article-filtering/search";
import { preloadAdminQueries } from "../../../app/route-preload";
import { MasterDataArticlePage } from "../../../pages/master-data/article-page";
import { catalogQueries } from "../../../queries/catalog";

export type ArticleRouteSearch = ArticleFilterSearch;

export const Route = createFileRoute("/admin/master-data/articles")({
  loader: ({ context }) =>
    preloadAdminQueries(context.queryClient, () =>
      Promise.all([
        context.queryClient.prefetchQuery(catalogQueries.articles()),
        context.queryClient.prefetchQuery(catalogQueries.suppliers())
      ])
    ),
  validateSearch: (search: Record<string, unknown>): ArticleRouteSearch =>
    serializeArticleFilters(parseArticleFilters(search)),
  component: MasterDataArticlesRoute
});

function MasterDataArticlesRoute() {
  const search = Route.useSearch();
  return <MasterDataArticlePage filters={parseArticleFilters(search)} />;
}
