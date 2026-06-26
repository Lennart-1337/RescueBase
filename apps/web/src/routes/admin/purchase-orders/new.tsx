import { createFileRoute } from "@tanstack/react-router";
import { readStringSearch, withPrunedSearch } from "../../../app/filter-utils";
import { AdminRoute } from "../../../app/admin-route";
import { PurchaseOrderNewPage } from "../../../pages/purchase-order-new-page";

type PurchaseOrderNewSearch = {
  mode?: string;
};

export const Route = createFileRoute("/admin/purchase-orders/new")({
  validateSearch: (search: Record<string, unknown>): PurchaseOrderNewSearch =>
    withPrunedSearch({ mode: readStringSearch(search.mode) }),
  component: PurchaseOrderNewRoute
});

function PurchaseOrderNewRoute() {
  return <AdminRoute>{() => <PurchaseOrderNewPage />}</AdminRoute>;
}
