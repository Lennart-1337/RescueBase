import { screen, waitFor, within } from "@testing-library/react";
import { article, supplier } from "../../../test-support/fixtures";
import { clickElement, getActiveRouter, renderAppAt, resetTestBrowser, stubFetch } from "../../../test-support/app-test-helpers";

const alternate = { ...article, id: "other", name: "Unsterile Kompresse", manufacturer: "Anderer Hersteller", category: "Kompressen", sterile: false, defaultSupplierId: undefined, barcode: undefined, defaultGrossPriceCents: 1000 };
function setup() {
  stubFetch({
    "/api/auth/setup/status": { initialized: true },
    "/api/auth/session": { user: { id: "admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
    "/api/catalog/articles": [{ ...article, defaultGrossPriceCents: 2000 }, alternate],
    "/api/catalog/suppliers": [supplier],
  });
}
afterEach(resetTestBrowser);
it("restores combined filters from URL and resets all of them", async () => {
  setup();
  await renderAppAt('/admin/master-data/articles?sterile=false&supplier=%5B%22__none__%22%5D&missing=%5B%22barcode%22%5D&priceBasis=unit&priceMax=1');
  await screen.findByRole("search", { name: "Artikel filtern" });
  expect(screen.getByText("Unsterile Kompresse")).toBeInTheDocument();
  expect(screen.queryByText(article.name)).toBeNull();
  await clickElement(screen.getByRole("button", { name: "Filter zurücksetzen" }));
  await waitFor(() => expect(screen.getByText(article.name)).toBeInTheDocument());
  expect(getActiveRouter()?.state.location.search).toEqual({});
});
it("keeps all category choices available when filters hide every article", async () => {
  setup();
  await renderAppAt('/admin/master-data/articles?q=does-not-exist');
  const filters = await screen.findByRole("search", { name: "Artikel filtern" });
  await clickElement(within(filters).getByText("Alle Kategorien"));
  expect(within(filters).getByLabelText("Verbandmaterial")).toBeInTheDocument();
  expect(within(filters).getByLabelText("Kompressen")).toBeInTheDocument();
});
