import { screen, waitFor, within } from "@testing-library/react";
import { article, batch, location } from "../test-support/fixtures";
import { changeValue, clickElement, postedBody, renderAppAt, resetTestBrowser, stubFetch } from "../test-support/app-test-helpers";

describe("InventoryPage", () => {
  afterEach(resetTestBrowser);

  it("submits new inventory batches with article, location, lot and expiry data", async () => {
    stubFetch(baseInventoryRoutes());
    await renderAppAt("/admin/inventory");
    await screen.findByRole("heading", { name: "Lager" });
    await changeValue(screen.getByLabelText("Chargennummer"), "RD-2028-02");
    await changeValue(screen.getByLabelText("Ablaufdatum"), "2028-02-29");
    await changeValue(screen.getByLabelText("Menge"), "25");
    await clickElement(screen.getByRole("button", { name: /Charge erfassen/ }));
    await waitFor(() => expect(postedBody("/api/inventory/batches")).toEqual({ articleId: "article-bandage", locationId: "loc-main", lotNumber: "RD-2028-02", expiresAt: "2028-02-29", quantity: 25 }));
  });

  it("submits batch corrections with reason and tracks history loading", async () => {
    stubFetch({ ...baseInventoryRoutes(), "/api/inventory/batches/batch-bandage-1/movements": [] });
    await renderAppAt("/admin/inventory");
    await screen.findByRole("heading", { name: "Lager" });
    await clickElement(await screen.findByRole("button", { name: /Korrigieren/ }));
    const correctionPanel = (await screen.findByRole("heading", { name: "Chargenkorrektur" })).closest("section");
    await changeValue(within(correctionPanel as HTMLElement).getByLabelText("Chargennummer"), "VB-2026-04A");
    await changeValue(within(correctionPanel as HTMLElement).getByLabelText("Begründung"), "Inventur");
    await clickElement(within(correctionPanel as HTMLElement).getByRole("button", { name: /Korrektur buchen/ }));
    await waitFor(() => expect(postedBody("/api/inventory/batches/batch-bandage-1/corrections")).toEqual({ reason: "Inventur", quantity: 120, lotNumber: "VB-2026-04A", expiresAt: "2027-04-30" }));
  });
});

function baseInventoryRoutes() {
  return {
    "/api/auth/setup/status": { initialized: true, firstAdminEmail: "admin@rescuebase.local" },
    "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
    "/api/inventory/batches": [batch],
    "/api/catalog/articles": [article],
    "/api/catalog/locations": [location]
  };
}
