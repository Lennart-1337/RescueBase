import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "../app/admin-route";
import { AdminDashboard } from "../pages/admin-dashboard";

export const Route = createFileRoute("/")({
  component: DashboardRoute
});

function DashboardRoute() {
  return <AdminRoute>{() => <AdminDashboard />}</AdminRoute>;
}
