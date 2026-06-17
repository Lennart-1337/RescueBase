import { screen, waitFor, within } from "@testing-library/react";
import { article, batch, location } from "../test-support/fixtures";
import { changeValue, clickElement, getActiveRouter, postedBody, renderAppAt, resetTestBrowser, stubFetch, wasRequested } from "../test-support/app-test-helpers";

describe("InventoryPage", () => {
  afterEach(resetTestBrowser);

  it("submits new inventory batches with article, location, lot and expiry data", async () => {
    stubFetch(baseInventoryRoutes());
    await renderAppAt("/admin/inventory");
    await screen.findByRole("heading", { name: "Lager" });
    await clickElement(screen.getByRole("button", { name: /Charge hinzufügen/ }));
    const dialog = await screen.findByRole("dialog", { name: "Charge erfassen" });
    await changeValue(within(dialog).getByLabelText("Chargennummer"), "RD-2028-02");
    await changeValue(within(dialog).getByLabelText("Ablaufdatum"), "2028-02-29");
    await changeValue(within(dialog).getByLabelText("Menge"), "25");
    await clickElement(within(dialog).getByRole("button", { name: /Charge erfassen/ }));
    await waitFor(() => expect(postedBody("/api/inventory/batches")).toEqual({ articleId: "article-bandage", locationId: "loc-main", lotNumber: "RD-2028-02", expiresAt: "2028-02-29", quantity: 25 }));
  });

  it("submits batch corrections with reason and tracks history loading", async () => {
    stubFetch({ ...baseInventoryRoutes(), "/api/inventory/batches/batch-bandage-1/movements": [] });
    await renderAppAt("/admin/inventory");
    await screen.findByRole("heading", { name: "Lager" });
    await clickElement(await screen.findByRole("button", { name: /Korrigieren/ }));
    const dialog = await screen.findByRole("dialog", { name: "Chargenkorrektur" });
    await changeValue(within(dialog).getByLabelText("Chargennummer"), "VB-2026-04A");
    await changeValue(within(dialog).getByLabelText("Begründung"), "Inventur");
    await clickElement(within(dialog).getByRole("button", { name: /Korrektur buchen/ }));
    await waitFor(() => expect(postedBody("/api/inventory/batches/batch-bandage-1/corrections")).toEqual({ reason: "Inventur", quantity: 120, lotNumber: "VB-2026-04A", expiresAt: "2027-04-30" }));
  });

  it("hides empty batches by default and can show them with a filter", async () => {
    stubFetch({ ...baseInventoryRoutes(), "/api/inventory/batches": [batch, { ...batch, id: "batch-empty-1", lotNumber: "VB-ALT-0", quantity: 0 }] });
    await renderAppAt("/admin/inventory");
    await screen.findByRole("heading", { name: "Lager" });
    expect(screen.queryByText(/VB-ALT-0/)).toBeNull();
    await clickElement(screen.getByLabelText("Chargen mit Menge 0 anzeigen"));
    expect(screen.getByText(/VB-ALT-0/)).toBeInTheDocument();
  });

  it("restores inventory filters from the URL and can reset them", async () => {
    stubFetch({
      ...baseInventoryRoutes(),
      "/api/inventory/batches": [
        batch,
        { ...batch, id: "batch-vehicle-1", lotNumber: "RTW-2027-01", locationId: "loc-vehicle", location: { id: "loc-vehicle", name: "Fahrzeug 1" } }
      ],
      "/api/catalog/locations": [location, { id: "loc-vehicle", name: "Fahrzeug 1", kind: "VEHICLE" }]
    });
    await renderAppAt("/admin/inventory?q=RTW&locationId=loc-vehicle");
    await screen.findByRole("heading", { name: "Lager" });
    expect(screen.getByLabelText("Suche")).toHaveValue("RTW");
    expect(screen.getByLabelText("Standort")).toHaveValue("Fahrzeug 1");
    expect(screen.getByText(/RTW-2027-01/)).toBeInTheDocument();
    expect(screen.queryByText(/VB-2026-04/)).toBeNull();

    await clickElement(screen.getByRole("button", { name: "Filter zurücksetzen" }));

    await waitFor(() => expect(screen.getByLabelText("Suche")).toHaveValue(""));
    expect(screen.getByText(/VB-2026-04/)).toBeInTheDocument();
    expect(getActiveRouter()?.state.location.search).toEqual({});
  });

  it("soft-deletes batches after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    stubFetch({ ...baseInventoryRoutes(), "/api/inventory/batches/batch-bandage-1": { ok: true } });
    await renderAppAt("/admin/inventory");
    await screen.findByRole("heading", { name: "Lager" });
    await clickElement(screen.getByRole("button", { name: /Charge VB-2026-04 löschen/ }));
    await waitFor(() => expect(wasRequested("/api/inventory/batches/batch-bandage-1", "DELETE")).toBe(true));
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
