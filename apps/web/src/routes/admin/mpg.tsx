import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AdminRoute } from "../../app/admin-route";
import { MpgPage, type MpgView } from "../../pages/mpg/mpg-page";

const views = new Set<MpgView>(["devices", "deadlines", "trainings", "people", "cylinders"]);
export const Route = createFileRoute("/admin/mpg")({
  validateSearch: (search: Record<string, unknown>) => ({
    view: views.has(search.view as MpgView) ? search.view as MpgView : "devices" as MpgView,
    device: typeof search.device === "string" && search.device ? search.device : undefined
  }),
  component: MpgRoute
});
function MpgRoute() {
  const search = Route.useSearch(), navigate = useNavigate({ from: "/admin/mpg" });
  return <AdminRoute>{user => <MpgPage deviceId={search.device} isAdmin={user.role === "ADMIN"} view={search.view} onView={view => void navigate({ search: { view, device: undefined } })} />}</AdminRoute>;
}
