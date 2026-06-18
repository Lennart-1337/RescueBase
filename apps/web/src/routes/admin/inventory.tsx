import { createFileRoute } from "@tanstack/react-router";
import { readBooleanSearch, readStringSearch, withPrunedSearch } from "../../app/filter-utils";
import { AdminRoute } from "../../app/admin-route";
import { InventoryPage } from "../../pages/inventory-page";

type InventorySearch = {
  articleId?: string;
  locationId?: string;
  q?: string;
  showEmpty?: true;
};

export const Route = createFileRoute("/admin/inventory")({
  validateSearch: (search: Record<string, unknown>): InventorySearch =>
    withPrunedSearch({
      articleId: readStringSearch(search.articleId),
      locationId: readStringSearch(search.locationId),
      q: readStringSearch(search.q),
      showEmpty: readBooleanSearch(search.showEmpty) ? true : undefined
    }),
  component: InventoryRoute
});

function InventoryRoute() {
  return <AdminRoute>{(user) => <InventoryPage user={user} />}</AdminRoute>;
}
