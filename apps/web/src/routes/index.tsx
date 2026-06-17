import { createFileRoute } from "@tanstack/react-router";
import { readStringSearch, withPrunedSearch } from "../app/filter-utils";
import { AdminRoute } from "../app/admin-route";
import { AdminDashboard } from "../pages/admin-dashboard";

type DashboardSearch = {
  orderLocationId?: string;
  orderQ?: string;
  orderStatus?: string;
};

export const Route = createFileRoute("/")({
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
