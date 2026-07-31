import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "../../app/admin-route";
import { preloadAdminQueries } from "../../app/route-preload";
import { UserManagementPage } from "../../pages/user-management-page";
import { alertQueries } from "../../queries/alerts";
import { userQueries } from "../../queries/users";

export const Route = createFileRoute("/admin/user-management")({
  loader: ({ context }) =>
    preloadAdminQueries(context.queryClient, () =>
      Promise.all([
        context.queryClient.prefetchQuery(alertQueries.subscriptions()),
        context.queryClient.prefetchQuery(userQueries.list())
      ])
    ),
  component: UserManagementRoute
});

function UserManagementRoute() {
  return <AdminRoute>{(user) => <UserManagementPage user={user} />}</AdminRoute>;
}
