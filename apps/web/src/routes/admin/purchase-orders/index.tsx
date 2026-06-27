import { createFileRoute } from "@tanstack/react-router";
import { readStringSearch, withPrunedSearch } from "../../../app/filter-utils";
import { PurchaseOrdersPage } from "../../../pages/purchase-orders-page";

type PurchaseOrderSearch = {
  q?: string;
  status?: string;
};

export const Route = createFileRoute("/admin/purchase-orders/")({
  validateSearch: (search: Record<string, unknown>): PurchaseOrderSearch =>
    withPrunedSearch({
      q: readStringSearch(search.q),
      status: readStringSearch(search.status)
    }),
  component: PurchaseOrdersPage
});
