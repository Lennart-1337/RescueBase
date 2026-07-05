import { createFileRoute } from "@tanstack/react-router";
import { preloadAdminQueries } from "../app/route-preload";
import { readStringSearch, withPrunedSearch } from "../app/filter-utils";
import { AdminRoute } from "../app/admin-route";
import { AdminDashboard } from "../pages/admin-dashboard";
import { alertQueries } from "../queries/alerts";
import { catalogQueries } from "../queries/catalog";
import { inventoryQueries } from "../queries/inventory";
import { orderQueries } from "../queries/orders";

type DashboardSearch = {
  orderLocationId?: string;
  orderQ?: string;
  orderStatus?: string;
};

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    preloadAdminQueries(context.queryClient, () =>
      Promise.all([
        context.queryClient.prefetchQuery(alertQueries.overview()),
        context.queryClient.prefetchQuery(catalogQueries.kits()),
        context.queryClient.prefetchQuery(inventoryQueries.batches()),
        context.queryClient.prefetchQuery(orderQueries.replenishmentList())
      ])
    ),
  validateSearch: (search: Record<string, unknown>): DashboardSearch =>
    withPrunedSearch({
      orderLocationId: readStringSearch(search.orderLocationId),
      orderQ: readStringSearch(search.orderQ),
      orderStatus: readStringSearch(search.orderStatus)
    }),
  component: DashboardRoute
});

function DashboardRoute() {
  return <AdminRoute>{() => <AdminDashboard />}</AdminRoute>;
}
