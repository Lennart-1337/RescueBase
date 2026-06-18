import { createFileRoute } from "@tanstack/react-router";
import { readStringSearch, withPrunedSearch } from "../../app/filter-utils";
import { AdminRoute } from "../../app/admin-route";
import { CheckProtocolsPage } from "../../pages/check-protocols-page";

export type CheckProtocolSearch = { kitId?: string; page?: number; q?: string; status?: string };

export const Route = createFileRoute("/admin/check-protocols")({
  validateSearch: (search: Record<string, unknown>): CheckProtocolSearch => withPrunedSearch({
    kitId: readStringSearch(search.kitId),
    page: readPage(search.page),
    q: readStringSearch(search.q),
    status: readStringSearch(search.status)
  }),
  component: CheckProtocolsRoute
});

function readPage(value: unknown) {
  const page = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(page) && page > 1 ? page : undefined;
}

function CheckProtocolsRoute() {
  return <AdminRoute>{() => <CheckProtocolsPage />}</AdminRoute>;
}
