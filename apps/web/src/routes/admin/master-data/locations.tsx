import { createFileRoute } from "@tanstack/react-router";
import { preloadAdminQueries } from "../../../app/route-preload";
import { MasterDataLocationPage } from "../../../pages/master-data/location-page";
import { catalogQueries } from "../../../queries/catalog";

export const Route = createFileRoute("/admin/master-data/locations")({
  loader: ({ context }) =>
    preloadAdminQueries(context.queryClient, () =>
      Promise.all([
        context.queryClient.prefetchQuery(catalogQueries.locations())
      ])
    ),
  component: MasterDataLocationsRoute
});

function MasterDataLocationsRoute() {
  return <MasterDataLocationPage />;
}
