import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "../../app/admin-route";
import { UsersPage } from "../../pages/users-page";

export const Route = createFileRoute("/admin/users")({
  component: UsersRoute
});

function UsersRoute() {
  return <AdminRoute>{(user) => <UsersPage user={user} />}</AdminRoute>;
}
