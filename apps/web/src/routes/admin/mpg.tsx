import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AdminRoute } from "../../app/admin-route";
import { ErrorPanel } from "../../components/state-panels";
import { MpgPage, type MpgView } from "../../pages/mpg/mpg-page";

const views = new Set<MpgView>(["devices", "models", "deadlines", "trainings", "people", "cylinders"]);
export const Route = createFileRoute("/admin/mpg")({
  validateSearch: (search: Record<string, unknown>) => ({
    view: views.has(search.view as MpgView) ? search.view as MpgView : "devices" as MpgView,
    device: typeof search.device === "string" && search.device ? search.device : undefined
  }),
  component: MpgRoute
});
function MpgRoute() {
  const search = Route.useSearch(), navigate = useNavigate({ from: "/admin/mpg" });
  return <AdminRoute>{user => user.role === "ADMIN" || user.medicalDevicesManage === true
    ? <MpgPage deviceId={search.device} view={search.view} onView={view => void navigate({ search: { view, device: undefined } })} />
    : <ErrorPanel error={new Error("Für die MPG-Verwaltung ist die Berechtigung „Medizinprodukte verwalten“ erforderlich.")} onRetry={() => window.location.reload()} />}</AdminRoute>;
}
