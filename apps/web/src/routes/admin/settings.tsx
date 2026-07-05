import { createFileRoute } from "@tanstack/react-router";
import { preloadAdminQueries } from "../../app/route-preload";
import { AdminRoute } from "../../app/admin-route";
import { SettingsPage } from "../../pages/settings-page";
import { settingsQueries } from "../../queries/settings";

export const Route = createFileRoute("/admin/settings")({
  loader: ({ context }) =>
    preloadAdminQueries(context.queryClient, () =>
      Promise.all([
        context.queryClient.prefetchQuery(settingsQueries.admin())
      ])
    ),
  component: SettingsRoute
});

function SettingsRoute() {
  return <AdminRoute>{(user) => <SettingsPage user={user} />}</AdminRoute>;
}
