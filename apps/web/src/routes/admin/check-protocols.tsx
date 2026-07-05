import { createFileRoute } from "@tanstack/react-router";
import { readStringSearch, withPrunedSearch } from "../../app/filter-utils";
import { preloadAdminQueries } from "../../app/route-preload";
import { AdminRoute } from "../../app/admin-route";
import { CheckProtocolsPage } from "../../pages/check-protocols-page";
import { catalogQueries } from "../../queries/catalog";
import { checkQueries } from "../../queries/checks";

export type CheckProtocolSearch = { kitId?: string; page?: number; q?: string; status?: string };

export const Route = createFileRoute("/admin/check-protocols")({
  loaderDeps: ({ search }) => ({
    kitId: search.kitId,
    page: String(search.page ?? 1),
    q: search.q,
    status: search.status
  }),
  loader: ({ context, deps }) =>
    preloadAdminQueries(context.queryClient, () =>
      Promise.all([
        context.queryClient.prefetchQuery(catalogQueries.kits()),
        context.queryClient.prefetchQuery(checkQueries.protocols({
          ...withPrunedSearch({
            kitId: deps.kitId,
            q: deps.q,
            status: deps.status
          }),
          page: deps.page
        }))
      ])
    ),
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
