import { createFileRoute } from "@tanstack/react-router";
import { preloadAdminQueries } from "../../../app/route-preload";
import { readStringSearch, withPrunedSearch } from "../../../app/filter-utils";
import { PurchaseOrderNewPage } from "../../../pages/purchase-order-new-page";
import { catalogQueries } from "../../../queries/catalog";
import { inventoryQueries } from "../../../queries/inventory";

type PurchaseOrderNewSearch = {
  mode?: string;
};

export const Route = createFileRoute("/admin/purchase-orders/new")({
  loader: ({ context }) =>
    preloadAdminQueries(context.queryClient, () =>
      Promise.all([
        context.queryClient.prefetchQuery(catalogQueries.articles()),
        context.queryClient.prefetchQuery(catalogQueries.locations()),
        context.queryClient.prefetchQuery(inventoryQueries.targets())
      ])
    ),
  validateSearch: (search: Record<string, unknown>): PurchaseOrderNewSearch =>
    withPrunedSearch({ mode: readStringSearch(search.mode) }),
  component: PurchaseOrderNewRoute
});

function PurchaseOrderNewRoute() {
  return <PurchaseOrderNewPage />;
}
