import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "../../app/admin-route";
import { KitsPage } from "../../pages/kits-page";

export const Route = createFileRoute("/admin/rucksaecke")({
  component: KitsRoute
});

function KitsRoute() {
  return <AdminRoute>{() => <KitsPage />}</AdminRoute>;
}
