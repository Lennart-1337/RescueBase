import { createFileRoute } from "@tanstack/react-router";
import { readStringSearch, withPrunedSearch } from "../../../app/filter-utils";
import { preloadAdminQueries } from "../../../app/route-preload";
import { MasterDataDevicePage } from "../../../pages/master-data/device-page";
import { catalogQueries } from "../../../queries/catalog";
import { deviceQueries } from "../../../queries/devices";

export type DeviceRouteSearch = {
  active?: string;
  articleId?: string;
  locationId?: string;
  q?: string;
};

export const Route = createFileRoute("/admin/master-data/devices")({
  loader: ({ context }) =>
    preloadAdminQueries(context.queryClient, () =>
      Promise.all([
        context.queryClient.prefetchQuery(catalogQueries.articles()),
        context.queryClient.prefetchQuery(catalogQueries.kits()),
        context.queryClient.prefetchQuery(catalogQueries.locations()),
        context.queryClient.prefetchQuery(deviceQueries.list())
      ])
    ),
  validateSearch: (search: Record<string, unknown>): DeviceRouteSearch =>
    withPrunedSearch({
      active: readStringSearch(search.active),
      articleId: readStringSearch(search.articleId),
      locationId: readStringSearch(search.locationId),
      q: readStringSearch(search.q)
    }),
  component: MasterDataDevicesRoute
});

function MasterDataDevicesRoute() {
  const search = Route.useSearch();
  return <MasterDataDevicePage filters={{ active: search.active ?? "", articleId: search.articleId ?? "", locationId: search.locationId ?? "", q: search.q ?? "" }} />;
}
