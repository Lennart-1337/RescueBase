import { createFileRoute } from "@tanstack/react-router";
import { preloadAdminQueries } from "../../../app/route-preload";
import { MasterDataTemplatePage } from "../../../pages/master-data/template-page";
import { catalogQueries } from "../../../queries/catalog";

export const Route = createFileRoute("/admin/master-data/templates")({
  loader: ({ context }) =>
    preloadAdminQueries(context.queryClient, () =>
      Promise.all([
        context.queryClient.prefetchQuery(catalogQueries.articles()),
        context.queryClient.prefetchQuery(catalogQueries.templates())
      ])
    ),
  component: MasterDataTemplatesRoute
});

function MasterDataTemplatesRoute() {
  return <MasterDataTemplatePage />;
}
