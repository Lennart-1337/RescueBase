import { createFileRoute } from "@tanstack/react-router";
import { readStringSearch, withPrunedSearch } from "../../app/filter-utils";
import { preloadAdminQueries } from "../../app/route-preload";
import { AdminRoute } from "../../app/admin-route";
import { KitsPage } from "../../pages/kits-page";
import { catalogQueries } from "../../queries/catalog";

type KitSearch = {
  locationId?: string;
  q?: string;
  status?: string;
  templateId?: string;
};

export const Route = createFileRoute("/admin/kits")({
  loader: ({ context }) =>
    preloadAdminQueries(context.queryClient, () =>
      Promise.all([
        context.queryClient.prefetchQuery(catalogQueries.kits()),
        context.queryClient.prefetchQuery(catalogQueries.locations()),
        context.queryClient.prefetchQuery(catalogQueries.templates())
      ])
    ),
  validateSearch: (search: Record<string, unknown>): KitSearch =>
    withPrunedSearch({
      locationId: readStringSearch(search.locationId),
      q: readStringSearch(search.q),
      status: readStringSearch(search.status),
      templateId: readStringSearch(search.templateId)
    }),
  component: KitsRoute
});

function KitsRoute() {
  return <AdminRoute>{() => <KitsPage />}</AdminRoute>;
}
