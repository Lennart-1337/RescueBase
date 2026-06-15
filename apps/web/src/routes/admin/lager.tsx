import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "../../app/admin-route";
import { InventoryPage } from "../../pages/inventory-page";

export const Route = createFileRoute("/admin/lager")({
  component: InventoryRoute
});

function InventoryRoute() {
  return <AdminRoute>{() => <InventoryPage />}</AdminRoute>;
}
