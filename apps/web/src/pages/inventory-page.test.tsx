import { screen, waitFor, within } from "@testing-library/react";
import { article, batch, inventoryTarget, location, procurementOrder } from "../test-support/fixtures";
import { changeValue, clickElement, getActiveRouter, postedBody, renderAppAt, requestBody, resetTestBrowser, stubFetch, wasRequested } from "../test-support/app-test-helpers";

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
    await waitFor(() => expect(postedBody("/api/inventory/batches/batch-bandage-1/corrections")).toEqual({ reason: "Inventur", quantity: 120, lotNumber: "VB-2026-04A", expiresAt: "2027-04-30", locationId: "loc-main" }));
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

  it("sets and clears Soll targets in Lager", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    stubFetch(baseInventoryRoutes());
    await renderAppAt("/admin/inventory");
    await screen.findByRole("heading", { name: "Lager" });

    await clickElement(screen.getByRole("button", { name: /Soll hinzufügen/ }));
    const dialog = await screen.findByRole("dialog", { name: "Sollbestand" });
    await changeValue(within(dialog).getByLabelText("Soll"), "160");
    await clickElement(within(dialog).getByRole("button", { name: /Soll speichern/ }));
    await waitFor(() => expect(requestBody("/api/inventory/targets/article-bandage/loc-main", "PUT")).toEqual({ targetQuantity: 160 }));

    await clickElement(screen.getByRole("button", { name: /Löschen/ }));
    await waitFor(() => expect(wasRequested("/api/inventory/targets/article-bandage/loc-main", "DELETE")).toBe(true));
  });

  it("starts and receives procurement orders into batches", async () => {
    stubFetch(baseInventoryRoutes({
      "/api/inventory/procurement-orders": [{ ...procurementOrder, status: "IN_PROGRESS" }]
    }));
    await renderAppAt("/admin/inventory");
    await screen.findByRole("heading", { name: "Lager" });

    await clickElement(screen.getByRole("button", { name: /Wareneingang/ }));
    const dialog = await screen.findByRole("dialog", { name: "Wareneingang" });
    await changeValue(within(dialog).getByLabelText("Chargennummer"), "VB-2030-01");
    await changeValue(within(dialog).getByLabelText("Ablaufdatum"), "2030-01-31");
    await changeValue(within(dialog).getByLabelText("Menge"), "12");
    expect(within(dialog).getByRole("button", { name: /Wareneingang buchen/ })).toBeDisabled();
    await clickElement(within(dialog).getByLabelText(/Lieferung geprüft/));
    await clickElement(within(dialog).getByRole("button", { name: /Wareneingang buchen/ }));

    await waitFor(() => expect(postedBody("/api/inventory/procurement-orders/proc-order-1/receive")).toEqual({
      verified: true,
      items: [{ lotNumber: "VB-2030-01", expiresAt: "2030-01-31", quantity: 12 }]
    }));
  });

  it("filters targets and procurement orders from the URL", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-18T12:55:00.000Z"));
    stubFetch(baseInventoryRoutes({
      "/api/inventory/targets": [
        inventoryTarget,
        { ...inventoryTarget, id: "target-alt", articleId: "article-alt", article: { ...inventoryTarget.article, id: "article-alt", name: "Reserveartikel" } }
      ],
      "/api/inventory/procurement-orders": [
        procurementOrder,
        { ...procurementOrder, id: "proc-alt", articleId: "article-alt", article: { ...procurementOrder.article, id: "article-alt", name: "Reserveartikel" } }
      ]
    }));
    await renderAppAt("/admin/inventory?q=Verband");
    await screen.findByRole("heading", { name: "Lager" });

    expect(screen.getAllByText("Verbandpäckchen mittel").length).toBeGreaterThan(0);
    expect(screen.queryByText("Reserveartikel")).toBeNull();
    expect(screen.getAllByRole("link", { name: "Link" })[0]).toHaveAttribute("href", "https://shop.example.org/articles/verbandpaeckchen-mittel");
    const pdfLink = screen.getByRole("link", { name: /PDF Einkaufsliste/ });
    expect(pdfLink).toHaveAttribute("href", "/api/reports/procurement.pdf?q=Verband&rev=2026-06-18T12%3A55%3A00.000Z");

    vi.setSystemTime(new Date("2026-06-18T12:56:00.000Z"));
    await clickElement(pdfLink);
    expect(pdfLink).toHaveAttribute("href", "/api/reports/procurement.pdf?q=Verband&rev=2026-06-18T12%3A56%3A00.000Z");
    vi.useRealTimers();
  });

  it("updates automation time and can trigger manual reconciliation", async () => {
    stubFetch(baseInventoryRoutes());
    await renderAppAt("/admin/inventory");
    await screen.findByRole("heading", { name: "Lager" });

    await changeValue(screen.getByLabelText("Tägliche Uhrzeit"), "06:30");
    await clickElement(screen.getByRole("button", { name: /Speichern/ }));
    await waitFor(() => expect(postedBody("/api/inventory/automation-config")).toEqual({ dailyReconcileTime: "06:30" }));
    await clickElement(screen.getByRole("button", { name: /Jetzt prüfen/ }));
    await waitFor(() => expect(wasRequested("/api/inventory/targets/reconcile", "POST")).toBe(true));
  });
});

function baseInventoryRoutes(extraRoutes: Record<string, unknown> = {}) {
  return {
    "/api/auth/setup/status": { initialized: true, firstAdminEmail: "admin@rescuebase.local" },
    "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
    "/api/inventory/batches": [batch],
    "/api/inventory/targets": [inventoryTarget],
    "/api/inventory/targets/article-bandage/loc-main": inventoryTarget,
    "/api/inventory/targets/reconcile": { checked: 1, created: 0, updated: 0, cancelled: 0 },
    "/api/inventory/procurement-orders": [procurementOrder],
    "/api/inventory/procurement-orders/proc-order-1/start": { ...procurementOrder, status: "IN_PROGRESS" },
    "/api/inventory/procurement-orders/proc-order-1/receive": { ...procurementOrder, status: "DONE", receivedQuantity: 30, remainingQuantity: 0 },
    "/api/inventory/procurement-orders/proc-order-1/cancel": { ...procurementOrder, status: "CANCELLED" },
    "/api/inventory/automation-config": { dailyReconcileTime: "02:00" },
    "/api/catalog/articles": [article],
    "/api/catalog/locations": [location],
    ...extraRoutes
  };
}
