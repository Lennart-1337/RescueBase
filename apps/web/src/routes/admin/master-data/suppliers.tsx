import { createFileRoute } from "@tanstack/react-router";
import { readStringSearch, withPrunedSearch } from "../../../app/filter-utils";
import { preloadAdminQueries } from "../../../app/route-preload";
import { MasterDataSupplierPage } from "../../../pages/master-data/supplier-page";
import { catalogQueries } from "../../../queries/catalog";

export type SupplierRouteSearch = {
  q?: string;
};

export const Route = createFileRoute("/admin/master-data/suppliers")({
  loader: ({ context }) =>
    preloadAdminQueries(context.queryClient, () =>
      Promise.all([
        context.queryClient.prefetchQuery(catalogQueries.articles()),
        context.queryClient.prefetchQuery(catalogQueries.suppliers()),
      ]),
    ),
  validateSearch: (search: Record<string, unknown>): SupplierRouteSearch =>
    withPrunedSearch({
      q: readStringSearch(search.q),
    }),
  component: MasterDataSuppliersRoute,
});

function MasterDataSuppliersRoute() {
  const search = Route.useSearch();
  return <MasterDataSupplierPage filters={{ q: search.q ?? "" }} />;
}
