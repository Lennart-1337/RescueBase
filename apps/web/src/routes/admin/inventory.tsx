import { createFileRoute } from "@tanstack/react-router";
import { readBooleanSearch, readStringSearch, withPrunedSearch } from "../../app/filter-utils";
import { preloadAdminQueries } from "../../app/route-preload";
import { AdminRoute } from "../../app/admin-route";
import { InventoryPage } from "../../pages/inventory-page";
import { catalogQueries } from "../../queries/catalog";
import { inventoryQueries } from "../../queries/inventory";

type InventorySearch = {
  articleId?: string;
  locationId?: string;
  q?: string;
  showEmpty?: true;
};

export const Route = createFileRoute("/admin/inventory")({
  loader: ({ context }) =>
    preloadAdminQueries(context.queryClient, () =>
      Promise.all([
        context.queryClient.prefetchQuery(catalogQueries.articles()),
        context.queryClient.prefetchQuery(catalogQueries.locations()),
        context.queryClient.prefetchQuery(inventoryQueries.batches()),
        context.queryClient.prefetchQuery(inventoryQueries.procurementOrders()),
        context.queryClient.prefetchQuery(inventoryQueries.targets())
      ])
    ),
  validateSearch: (search: Record<string, unknown>): InventorySearch =>
    withPrunedSearch({
      articleId: readStringSearch(search.articleId),
      locationId: readStringSearch(search.locationId),
      q: readStringSearch(search.q),
      showEmpty: readBooleanSearch(search.showEmpty) ? true : undefined
    }),
  component: InventoryRoute
});

function InventoryRoute() {
  return <AdminRoute>{(user) => <InventoryPage user={user} />}</AdminRoute>;
}
