import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "../../app/admin-route";

export const Route = createFileRoute("/admin/purchase-orders")({
  component: PurchaseOrdersLayoutRoute
});

function PurchaseOrdersLayoutRoute() {
  return <AdminRoute>{() => <Outlet />}</AdminRoute>;
}
