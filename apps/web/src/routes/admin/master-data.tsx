import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "../../app/admin-route";
import { MasterDataPage } from "../../pages/master-data-page";

export const Route = createFileRoute("/admin/master-data")({
  component: MasterDataRoute
});

function MasterDataRoute() {
  return <AdminRoute>{(user) => <MasterDataPage user={user} />}</AdminRoute>;
}
