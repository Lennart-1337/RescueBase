import { screen, waitFor, within } from "@testing-library/react";
import { article, batch, inventoryTarget, location } from "../test-support/fixtures";
import { changeValue, clickElement, getActiveRouter, postedBody, renderAppAt, requestBody, resetTestBrowser, stubFetch, wasRequested } from "../test-support/app-test-helpers";

describe("InventoryPage", () => {
  afterEach(resetTestBrowser);

  it("switches between stock and target views", async () => {
    stubFetch(baseInventoryRoutes());
    await renderAppAt("/admin/inventory");
    await screen.findByRole("heading", { name: "Lager" });

    await clickElement(screen.getByRole("tab", { name: "Sollbestände" }));

    expect(screen.getByRole("region", { name: "Sollbestände" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Bestandschargen" })).toBeNull();
    expect(getActiveRouter()?.state.location.search).toMatchObject({ view: "targets" });
  });

  it("submits new inventory batches with article, location, lot and expiry data", async () => {
    stubFetch(baseInventoryRoutes());
    await renderAppAt("/admin/inventory");
    await screen.findByRole("heading", { name: "Lager" });
    expect(screen.getByRole("search", { name: "Bestand filtern" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Bestandschargen" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Sollbestände" })).toBeInTheDocument();
    await clickElement(screen.getByRole("button", { name: /Charge hinzufügen/ }));
    const dialog = await screen.findByRole("dialog", { name: "Charge erfassen" });
    await changeValue(within(dialog).getByLabelText("Chargennummer"), "RD-2028-02");
    await changeValue(within(dialog).getByLabelText("Ablaufdatum"), "2028-02-29");
    await changeValue(within(dialog).getByLabelText("Menge"), "25");
    await clickElement(within(dialog).getByRole("button", { name: /Charge erfassen/ }));
    await waitFor(() => expect(postedBody("/api/inventory/batches")).toEqual({ articleId: "article-bandage", locationId: "loc-main", lotNumber: "RD-2028-02", expiresAt: "2028-02-29", quantity: 25 }));
  });

  it("opens the batch dialog without filler helper copy", async () => {
    stubFetch(baseInventoryRoutes());
    await renderAppAt("/admin/inventory");
    await screen.findByRole("heading", { name: "Lager" });

    await clickElement(screen.getByRole("button", { name: /Charge hinzufügen/ }));
    const dialog = await screen.findByRole("dialog", { name: "Charge erfassen" });

    expect(within(dialog).queryByText("Neue Bestände werden chargengenau mit Ablaufdatum angelegt.")).toBeNull();
    expect(within(dialog).queryByText("Bestände werden ausschließlich als neue Charge angelegt, nicht direkt auf vorhandene Chargen addiert.")).toBeNull();
  });

  it("opens the target dialog without filler helper copy", async () => {
    stubFetch(baseInventoryRoutes());
    await renderAppAt("/admin/inventory");
    await screen.findByRole("heading", { name: "Lager" });
    await clickElement(screen.getByRole("tab", { name: "Sollbestände" }));

    await clickElement(screen.getByRole("button", { name: /Soll hinzufügen/ }));
    const dialog = await screen.findByRole("dialog", { name: "Sollbestand" });

    expect(within(dialog).queryByText("Sollbestand pro Artikel und Standort festlegen.")).toBeNull();
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

  it("renders batch correction buttons with the secondary outline variant before selection", async () => {
    stubFetch(baseInventoryRoutes());
    await renderAppAt("/admin/inventory");
    await screen.findByRole("heading", { name: "Lager" });

    expect(await screen.findByRole("button", { name: /Korrigieren/ })).toHaveClass("button-secondary");
  });

  it("opens the correction dialog without filler helper copy", async () => {
    stubFetch({ ...baseInventoryRoutes(), "/api/inventory/batches/batch-bandage-1/movements": [] });
    await renderAppAt("/admin/inventory");
    await screen.findByRole("heading", { name: "Lager" });

    await clickElement(await screen.findByRole("button", { name: /Korrigieren/ }));
    const dialog = await screen.findByRole("dialog", { name: "Chargenkorrektur" });

    expect(within(dialog).queryByText("Chargen werden nachvollziehbar über Korrekturbuchungen statt Feldüberschreibung geändert.")).toBeNull();
    expect(within(dialog).queryByText("Bewegungen und Korrekturen dieser Charge.")).toBeNull();
  });

  it("marks the correction form with a dedicated tablet layout hook", async () => {
    stubFetch({ ...baseInventoryRoutes(), "/api/inventory/batches/batch-bandage-1/movements": [] });
    await renderAppAt("/admin/inventory");
    await screen.findByRole("heading", { name: "Lager" });

    await clickElement(await screen.findByRole("button", { name: /Korrigieren/ }));
    const dialog = await screen.findByRole("dialog", { name: "Chargenkorrektur" });
    const formGrid = within(dialog).getByLabelText("Chargennummer").closest(".batch-correction-grid");

    expect(formGrid).toHaveClass("batch-correction-grid", "form-grid", "form-grid-two");
  });

  it("marks the correction expiry field with the mobile width hook", async () => {
    stubFetch({ ...baseInventoryRoutes(), "/api/inventory/batches/batch-bandage-1/movements": [] });
    await renderAppAt("/admin/inventory");
    await screen.findByRole("heading", { name: "Lager" });

    await clickElement(await screen.findByRole("button", { name: /Korrigieren/ }));
    const dialog = await screen.findByRole("dialog", { name: "Chargenkorrektur" });
    const expiryField = within(dialog).getByLabelText("Ablaufdatum").closest(".field");

    expect(expiryField).toHaveClass("batch-correction-expiry-field");
  });

  it("renders correction history rows with compact modal spacing hooks", async () => {
    stubFetch({
      ...baseInventoryRoutes(),
      "/api/inventory/batches/batch-bandage-1/movements": [
        { id: "movement-1", type: "REPLENISHMENT_FULFILLMENT", quantity: -1, createdAt: "2026-06-14T09:39:00.000Z", actorLabel: "Lagerteam", reason: "SHORTAGE" }
      ]
    });
    await renderAppAt("/admin/inventory");
    await screen.findByRole("heading", { name: "Lager" });

    await clickElement(await screen.findByRole("button", { name: /Korrigieren/ }));
    const dialog = await screen.findByRole("dialog", { name: "Chargenkorrektur" });
    const historyRow = within(dialog).getByText("Nachfüllung").closest(".batch-correction-history-row");

    expect(historyRow).toHaveClass("batch-correction-history-row");
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

  it("renders the inventory header without redundant helper copy", async () => {
    stubFetch(baseInventoryRoutes());
    await renderAppAt("/admin/inventory");
    await screen.findByRole("heading", { name: "Lager" });

    expect(screen.queryByText("Bestand, Sollmengen und Beschaffung nach Standort.")).toBeNull();
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
    await clickElement(screen.getByRole("tab", { name: "Sollbestände" }));

    await clickElement(screen.getByRole("button", { name: /Soll hinzufügen/ }));
    const dialog = await screen.findByRole("dialog", { name: "Sollbestand" });
    await changeValue(within(dialog).getByLabelText("Soll"), "160");
    await clickElement(within(dialog).getByRole("button", { name: /Soll speichern/ }));
    await waitFor(() => expect(requestBody("/api/inventory/targets/article-bandage/loc-main", "PUT")).toEqual({ targetQuantity: 160 }));

    await clickElement(screen.getByRole("button", { name: /Löschen/ }));
    await waitFor(() => expect(wasRequested("/api/inventory/targets/article-bandage/loc-main", "DELETE")).toBe(true));
  });

  it("does not show the automation panel in Lager", async () => {
    stubFetch(baseInventoryRoutes());
    await renderAppAt("/admin/inventory");
    await screen.findByRole("heading", { name: "Lager" });
    expect(screen.queryByRole("heading", { name: "Automatik" })).toBeNull();
    expect(screen.queryByLabelText("Tägliche Uhrzeit")).toBeNull();
    expect(screen.queryByRole("button", { name: /Jetzt prüfen/ })).toBeNull();
  });
});

function baseInventoryRoutes(extraRoutes: Record<string, unknown> = {}) {
  return {
    "/api/auth/setup/status": { initialized: true },
    "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
    "/api/inventory/batches": [batch],
    "/api/inventory/targets": [inventoryTarget],
    "/api/inventory/targets/article-bandage/loc-main": inventoryTarget,
    "/api/inventory/targets/reconcile": { checked: 1, created: 0, updated: 0, cancelled: 0 },
    "/api/inventory/automation-config": { dailyReconcileTime: "02:00" },
    "/api/catalog/articles": [article],
    "/api/catalog/locations": [location],
    ...extraRoutes
  };
}
