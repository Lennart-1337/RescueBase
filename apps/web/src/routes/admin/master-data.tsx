import { createFileRoute } from "@tanstack/react-router";
import { readBooleanSearch, readStringSearch, withPrunedSearch } from "../../app/filter-utils";
import { AdminRoute } from "../../app/admin-route";
import { MasterDataPage } from "../../pages/master-data-page";

type MasterDataSearch = {
  active?: string;
  articleId?: string;
  category?: string;
  criticalDefault?: true;
  locationId?: string;
  medicalDevice?: true;
  mtkRequired?: true;
  q?: string;
  stkRequired?: true;
  tab: string;
};

export const Route = createFileRoute("/admin/master-data")({
  validateSearch: (search: Record<string, unknown>): MasterDataSearch => ({
    ...withPrunedSearch({
      active: readStringSearch(search.active),
      articleId: readStringSearch(search.articleId),
      category: readStringSearch(search.category),
      criticalDefault: readBooleanSearch(search.criticalDefault) ? true : undefined,
      locationId: readStringSearch(search.locationId),
      medicalDevice: readBooleanSearch(search.medicalDevice) ? true : undefined,
      mtkRequired: readBooleanSearch(search.mtkRequired) ? true : undefined,
      q: readStringSearch(search.q),
      stkRequired: readBooleanSearch(search.stkRequired) ? true : undefined
    }),
    tab: readStringSearch(search.tab) || "articles"
  }),
  component: MasterDataRoute
});

function MasterDataRoute() {
  return <AdminRoute>{(user) => <MasterDataPage user={user} />}</AdminRoute>;
}
