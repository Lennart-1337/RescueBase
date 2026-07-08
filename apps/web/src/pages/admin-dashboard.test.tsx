import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { formatDate } from "../app/formatters";
import { batch, kit, order } from "../test-support/fixtures";
import { changeValue, clickElement, getActiveRouter, postedBody, renderAppAt, resetTestBrowser, stubFetch, wasRequested } from "../test-support/app-test-helpers";

describe("AdminDashboard", () => {
  afterEach(resetTestBrowser);

  it("opens order fulfillment in a dialog and submits partial fulfillment", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/catalog/kits": [kit],
      "/api/inventory/batches": [
        batch,
        { ...batch, id: "batch-bandage-2", lotNumber: "VB-2026-02", expiresAt: "2026-11-30", quantity: 2 }
      ],
      "/api/replenishment-orders": [order],
      "/api/replenishment-orders/order-1001/fulfill": { ok: true },
      "/api/alerts/warnings": { generatedAt: "2026-06-17T00:00:00.000Z", warnings: [], summary: { expiry: 0, stkDue: 0, mtkDue: 0, shortage: 0 } }
    });
    await renderAppAt("/");
    await screen.findByRole("heading", { name: "Nachfüllaufträge" });
    expect(screen.getByRole("search", { name: "Aufträge filtern" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Nachfüllaufträge" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Warnungen" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Warnungen" })).toBeInTheDocument();
    await clickElement(screen.getByRole("button", { name: /Rucksack Fahrzeug 1/ }));
    const dialog = await screen.findByRole("dialog", { name: "Nachfüllauftrag" });
    const batchSelect = within(dialog).getByRole("combobox", { name: "Charge für Verbandpäckchen mittel" });
    const firstBatchLabel = `VB-2026-02 · 2 verfügbar · Ablauf ${formatDate("2026-11-30")}`;
    const secondBatchLabel = `VB-2026-04 · 120 verfügbar · Ablauf ${formatDate("2027-04-30")}`;
    expect(within(dialog).getByText("Charge")).toBeInTheDocument();
    expect(batchSelect).toHaveValue(firstBatchLabel);
    fireEvent.focus(batchSelect);
    expect(screen.getByRole("option", { name: firstBatchLabel })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: secondBatchLabel })).toBeInTheDocument();
    expect(dialog.querySelector(".modal-footer")).not.toBeNull();
    expect(within(dialog).queryByRole("button", { name: "In Bearbeitung" })).toBeNull();
    expect(within(dialog).getByRole("button", { name: "Stornieren" })).toBeInTheDocument();
    await clickElement(within(dialog).getByLabelText("Auffüllen erhöhen"));
    await clickElement(within(dialog).getByRole("button", { name: /Teilfüllung buchen/ }));
    await waitFor(() => expect(postedBody("/api/replenishment-orders/order-1001/fulfill")).toEqual({ items: [{ itemId: "pos-bandage", batchId: "batch-bandage-2", quantity: 1 }] }));
  });

  it("cancels replenishment orders from the detail dialog", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/catalog/kits": [kit],
      "/api/inventory/batches": [batch],
      "/api/replenishment-orders": [order],
      "/api/replenishment-orders/order-1001/cancel": { ...order, status: "CANCELLED" },
      "/api/alerts/warnings": { generatedAt: "2026-06-17T00:00:00.000Z", warnings: [], summary: { expiry: 0, stkDue: 0, mtkDue: 0, shortage: 0 } }
    });
    await renderAppAt("/");
    await screen.findByRole("heading", { name: "Nachfüllaufträge" });
    await clickElement(screen.getByRole("button", { name: /Rucksack Fahrzeug 1/ }));
    const dialog = await screen.findByRole("dialog", { name: "Nachfüllauftrag" });
    await clickElement(within(dialog).getByRole("button", { name: "Stornieren" }));
    await waitFor(() => expect(wasRequested("/api/replenishment-orders/order-1001/cancel", "POST")).toBe(true));
  });

  it("hides cancel for completed replenishment orders", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/catalog/kits": [kit],
      "/api/inventory/batches": [batch],
      "/api/replenishment-orders": [{ ...order, status: "DONE" }],
      "/api/alerts/warnings": { generatedAt: "2026-06-17T00:00:00.000Z", warnings: [], summary: { expiry: 0, stkDue: 0, mtkDue: 0, shortage: 0 } }
    });
    await renderAppAt("/");
    await screen.findByRole("heading", { name: "Nachfüllaufträge" });
    await clickElement(screen.getByRole("button", { name: /Rucksack Fahrzeug 1/ }));
    const dialog = await screen.findByRole("dialog", { name: "Nachfüllauftrag" });
    expect(within(dialog).queryByRole("button", { name: "Stornieren" })).toBeNull();
  });

  it("filters replenishment orders by location from the URL", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/catalog/kits": [kit, { ...kit, id: "kit-rucksack-2", name: "Reserve Rucksack", locationId: "loc-alt", location: { id: "loc-alt", name: "Außenlager" }, publicToken: "SAN-RS-002" }],
      "/api/inventory/batches": [batch],
      "/api/replenishment-orders": [order, { ...order, id: "order-1002", kitId: "kit-rucksack-2", kit: { id: "kit-rucksack-2", name: "Reserve Rucksack", code: "SAN-RS-001", status: "READY", publicToken: "SAN-RS-002" } }],
      "/api/alerts/warnings": { generatedAt: "2026-06-17T00:00:00.000Z", warnings: [], summary: { expiry: 0, stkDue: 0, mtkDue: 0, shortage: 0 } }
    });
    await renderAppAt("/?orderLocationId=loc-alt");
    await screen.findByRole("heading", { name: "Nachfüllaufträge" });
    expect(screen.getByLabelText("Standort")).toHaveValue("Außenlager");
    expect(screen.getByText("Reserve Rucksack")).toBeInTheDocument();
    expect(screen.queryByText("Rucksack Fahrzeug 1")).toBeNull();

    await clickElement(screen.getByRole("button", { name: "Filter zurücksetzen" }));
    await waitFor(() => expect(getActiveRouter()?.state.location.search).toEqual({}));
  });

  it("restores the status filter with the searchable select", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/catalog/kits": [kit],
      "/api/inventory/batches": [batch],
      "/api/replenishment-orders": [{ ...order, status: "DONE" }, { ...order, id: "order-1002", status: "CANCELLED" }],
      "/api/alerts/warnings": { generatedAt: "2026-06-17T00:00:00.000Z", warnings: [], summary: { expiry: 0, stkDue: 0, mtkDue: 0, shortage: 0 } }
    });
    await renderAppAt("/?orderStatus=DONE");
    await screen.findByRole("heading", { name: "Nachfüllaufträge" });

    const statusFilter = screen.getByLabelText("Status");
    expect(statusFilter).toHaveValue("Erledigt");

    await changeValue(statusFilter, "Stor");

    expect(await screen.findByRole("option", { name: "Storniert" })).toBeInTheDocument();
  });

  it("keeps the dashboard header and panels compact", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/catalog/kits": [kit],
      "/api/inventory/batches": [batch],
      "/api/replenishment-orders": [order],
      "/api/alerts/warnings": { generatedAt: "2026-06-17T00:00:00.000Z", warnings: [], summary: { expiry: 0, stkDue: 0, mtkDue: 0, shortage: 0 } }
    });
    await renderAppAt("/");
    await screen.findByRole("heading", { name: "Nachfüllaufträge" });

    expect(screen.queryByText("Offene Mängel, Teilfüllungen und Ablaufwarnungen im Blick.")).toBeNull();
    expect(screen.queryByText("Teilfüllungen buchen konkrete Chargen aus dem Lager.")).toBeNull();
    expect(screen.queryByText("Aktive Fälligkeits- und Ablaufwarnungen.")).toBeNull();
  });
});
