import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "../../app/admin-route";
import { AccountPage } from "../../pages/account-page";

export const Route = createFileRoute("/admin/account")({
  component: AccountRoute
});

function AccountRoute() {
  return <AdminRoute>{(user) => <AccountPage user={user} />}</AdminRoute>;
}
