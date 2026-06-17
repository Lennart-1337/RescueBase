import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "../../app/admin-route";
import { MasterDataLayout } from "../../pages/master-data/master-data-layout";

export const Route = createFileRoute("/admin/master-data")({
  component: MasterDataLayoutRoute
});

function MasterDataLayoutRoute() {
  return <AdminRoute>{() => <MasterDataLayout />}</AdminRoute>;
}
