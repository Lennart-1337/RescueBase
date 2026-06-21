import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "../../app/admin-route";
import { SettingsPage } from "../../pages/settings-page";

export const Route = createFileRoute("/admin/settings")({ component: SettingsRoute });

function SettingsRoute() {
  return <AdminRoute>{(user) => <SettingsPage user={user} />}</AdminRoute>;
}
