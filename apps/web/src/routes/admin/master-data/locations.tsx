import { createFileRoute } from "@tanstack/react-router";
import { MasterDataLocationPage } from "../../../pages/master-data/location-page";

export const Route = createFileRoute("/admin/master-data/locations")({
  component: MasterDataLocationsRoute
});

function MasterDataLocationsRoute() {
  return <MasterDataLocationPage />;
}
