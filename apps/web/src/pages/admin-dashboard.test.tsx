import { screen, waitFor, within } from "@testing-library/react";
import { batch, kit, order } from "../test-support/fixtures";
import { clickElement, getActiveRouter, postedBody, renderAppAt, resetTestBrowser, stubFetch } from "../test-support/app-test-helpers";

describe("AdminDashboard", () => {
  afterEach(resetTestBrowser);

  it("opens order fulfillment in a dialog and submits partial fulfillment", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true, firstAdminEmail: "admin@rescuebase.local" },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/catalog/kits": [kit],
      "/api/inventory/batches": [batch],
      "/api/replenishment-orders": [order],
      "/api/replenishment-orders/order-1001/fulfill": { ok: true },
      "/api/alerts/warnings": { generatedAt: "2026-06-17T00:00:00.000Z", warnings: [], summary: { expiry: 0, stkDue: 0, mtkDue: 0 } }
    });
    await renderAppAt("/");
    await screen.findByRole("heading", { name: "Nachfüllzentrale" });
    expect(await screen.findByRole("heading", { name: "Warnungen" })).toBeInTheDocument();
    await clickElement(screen.getByRole("button", { name: /Rucksack Fahrzeug 1/ }));
    const dialog = await screen.findByRole("dialog", { name: "Nachfüllauftrag" });
    await clickElement(within(dialog).getByLabelText("Auffüllen erhöhen"));
    await clickElement(within(dialog).getByRole("button", { name: /Teilfüllung buchen/ }));
    await waitFor(() => expect(postedBody("/api/replenishment-orders/order-1001/fulfill")).toEqual({ items: [{ itemId: "pos-bandage", batchId: "batch-bandage-1", quantity: 1 }] }));
  });

  it("filters replenishment orders by location from the URL", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true, firstAdminEmail: "admin@rescuebase.local" },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/catalog/kits": [kit, { ...kit, id: "kit-rucksack-2", name: "Reserve Rucksack", locationId: "loc-alt", location: { id: "loc-alt", name: "Außenlager" }, publicToken: "SAN-RS-002" }],
      "/api/inventory/batches": [batch],
      "/api/replenishment-orders": [order, { ...order, id: "order-1002", kitId: "kit-rucksack-2", kit: { id: "kit-rucksack-2", name: "Reserve Rucksack", code: "SAN-RS-001", status: "READY", publicToken: "SAN-RS-002" } }],
      "/api/alerts/warnings": { generatedAt: "2026-06-17T00:00:00.000Z", warnings: [], summary: { expiry: 0, stkDue: 0, mtkDue: 0 } }
    });
    await renderAppAt("/?orderLocationId=loc-alt");
    await screen.findByRole("heading", { name: "Nachfüllzentrale" });
    expect(screen.getByLabelText("Standort")).toHaveValue("loc-alt");
    expect(screen.getByText("Reserve Rucksack")).toBeInTheDocument();
    expect(screen.queryByText("Rucksack Fahrzeug 1")).toBeNull();

    await clickElement(screen.getByRole("button", { name: "Filter zurücksetzen" }));
    await waitFor(() => expect(getActiveRouter()?.state.location.search).toEqual({}));
  });
});
