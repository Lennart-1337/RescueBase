import { createFileRoute } from "@tanstack/react-router";
import { preloadAdminQueries } from "../../app/route-preload";
import { AdminRoute } from "../../app/admin-route";
import { UsersPage } from "../../pages/users-page";
import { alertQueries } from "../../queries/alerts";
import { userQueries } from "../../queries/users";

export const Route = createFileRoute("/admin/users")({
  loader: ({ context }) =>
    preloadAdminQueries(context.queryClient, () =>
      Promise.all([
        context.queryClient.prefetchQuery(alertQueries.subscriptions()),
        context.queryClient.prefetchQuery(userQueries.list())
      ])
    ),
  component: UsersRoute
});

function UsersRoute() {
  return <AdminRoute>{(user) => <UsersPage user={user} />}</AdminRoute>;
}
