import { createFileRoute } from "@tanstack/react-router";
import { preloadAdminQueries } from "../../app/route-preload";
import { AdminRoute } from "../../app/admin-route";
import { AccountPage } from "../../pages/account-page";
import { alertQueries } from "../../queries/alerts";
import { catalogQueries } from "../../queries/catalog";

export const Route = createFileRoute("/admin/account")({
  loader: ({ context }) =>
    preloadAdminQueries(context.queryClient, () =>
      Promise.all([
        context.queryClient.prefetchQuery(alertQueries.subscriptionsMe()),
        context.queryClient.prefetchQuery(catalogQueries.locations())
      ])
    ),
  component: AccountRoute
});

function AccountRoute() {
  return <AdminRoute>{(user) => <AccountPage user={user} />}</AdminRoute>;
}
