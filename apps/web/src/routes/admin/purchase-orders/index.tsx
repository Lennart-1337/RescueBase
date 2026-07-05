import { createFileRoute } from "@tanstack/react-router";
import { preloadAdminQueries } from "../../../app/route-preload";
import { readStringSearch, withPrunedSearch } from "../../../app/filter-utils";
import { PurchaseOrdersPage } from "../../../pages/purchase-orders-page";
import { orderQueries } from "../../../queries/orders";

type PurchaseOrderSearch = {
  q?: string;
  status?: string;
  view?: "archived";
};

export const Route = createFileRoute("/admin/purchase-orders/")({
  loader: ({ context }) =>
    preloadAdminQueries(context.queryClient, () =>
      Promise.all([
        context.queryClient.prefetchQuery(orderQueries.purchaseList())
      ])
    ),
  validateSearch: (search: Record<string, unknown>): PurchaseOrderSearch =>
    withPrunedSearch({
      q: readStringSearch(search.q),
      status: readStringSearch(search.status),
      view: readStringSearch(search.view) === "archived" ? "archived" : undefined
    }),
  component: PurchaseOrdersPage
});
