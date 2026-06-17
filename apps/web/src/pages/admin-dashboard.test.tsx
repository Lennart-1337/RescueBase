import { screen, waitFor, within } from "@testing-library/react";
import { batch, kit, order } from "../test-support/fixtures";
import { clickElement, postedBody, renderAppAt, resetTestBrowser, stubFetch } from "../test-support/app-test-helpers";

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
});
