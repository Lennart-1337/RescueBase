import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "../../app/admin-route";
import { preloadAdminQueries } from "../../app/route-preload";
import { UserManagementPage } from "../../pages/user-management-page";
import { userQueries } from "../../queries/users";

export const Route = createFileRoute("/admin/user-management")({
  loader: ({ context }) =>
    preloadAdminQueries(context.queryClient, () =>
      context.queryClient.prefetchQuery(userQueries.list())
    ),
  component: UserManagementRoute
});

function UserManagementRoute() {
  return <AdminRoute>{(user) => <UserManagementPage user={user} />}</AdminRoute>;
}
