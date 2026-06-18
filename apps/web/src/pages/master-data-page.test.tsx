import { screen, waitFor, within } from "@testing-library/react";
import { article, kit, location } from "../test-support/fixtures";
import { changeValue, clickElement, getActiveRouter, postedBody, renderAppAt, requestBody, resetTestBrowser, stubFetch, wasRequested } from "../test-support/app-test-helpers";

describe("MasterDataPage", () => {
  afterEach(resetTestBrowser);

  it("submits new articles from the admin master data screen", async () => {
    stubFetch(baseAdminRoutes());
    await renderAppAt("/admin/master-data/articles");
    await screen.findByRole("heading", { name: "Stammdaten" });
    await clickElement(await screen.findByRole("button", { name: /Artikel hinzufügen/ }));
    const dialog = await screen.findByRole("dialog", { name: "Artikel anlegen" });
    await changeValue(within(dialog).getByLabelText("Name"), "Rettungsdecke");
    await changeValue(within(dialog).getByLabelText("Einheit"), "Stück");
    await changeValue(within(dialog).getByLabelText("Hersteller"), "Acme Medical");
    await changeValue(within(dialog).getByLabelText("Kategorie"), "Verbrauchsmaterial");
    await changeValue(within(dialog).getByLabelText("Barcode/DataMatrix"), "040000000099");
    await changeValue(within(dialog).getByLabelText("Artikel-Link"), "https://shop.example.org/articles/rettungsdecke");
    await clickElement(within(dialog).getByLabelText("Steril"));
    await clickElement(within(dialog).getByLabelText("Medizinprodukt (MPDG)"));
    await clickElement(within(dialog).getByLabelText("STK erforderlich"));
    await changeValue(within(dialog).getByLabelText("STK-Intervall (Monate)"), "12");
    await clickElement(within(dialog).getByLabelText("MTK erforderlich"));
    await changeValue(within(dialog).getByLabelText("MTK-Intervall (Monate)"), "24");
    await clickElement(within(dialog).getByRole("button", { name: /Artikel anlegen/ }));
    await waitFor(() => expect(postedBody("/api/catalog/articles")).toEqual({
      name: "Rettungsdecke",
      unit: "Stück",
      manufacturer: "Acme Medical",
      category: "Verbrauchsmaterial",
      barcode: "040000000099",
      articleUrl: "https://shop.example.org/articles/rettungsdecke",
      sterile: true,
      medicalDevice: true,
      stkRequired: true,
      stkIntervalMonths: 12,
      mtkRequired: true,
      mtkIntervalMonths: 24,
      criticalDefault: false
    }));
  });

  it("edits existing articles from the admin master data screen", async () => {
    stubFetch({ ...baseAdminRoutes(), "/api/catalog/articles/article-bandage": { ...article, name: "Verbandpäckchen groß", barcode: "040000000099" } });
    await renderAppAt("/admin/master-data/articles");
    await screen.findByRole("heading", { name: "Stammdaten" });
    await clickElement(await screen.findByRole("button", { name: /Bearbeiten/ }));
    const dialog = await screen.findByRole("dialog", { name: "Artikel bearbeiten" });
    await changeValue(within(dialog).getByLabelText("Name"), "Verbandpäckchen groß");
    await changeValue(within(dialog).getByLabelText("Hersteller"), "MediSafe");
    await changeValue(within(dialog).getByLabelText("Hersteller-Art.-Nr."), "VB-2000");
    await changeValue(within(dialog).getByLabelText("Barcode/DataMatrix"), "040000000099");
    await changeValue(within(dialog).getByLabelText("Artikel-Link"), "https://shop.example.org/articles/verbandpaeckchen-gross");
    await changeValue(within(dialog).getByLabelText("Lagerhinweise"), "Trocken lagern");
    await clickElement(within(dialog).getByLabelText("Medizinprodukt (MPDG)"));
    await clickElement(within(dialog).getByLabelText("STK erforderlich"));
    await changeValue(within(dialog).getByLabelText("STK-Intervall (Monate)"), "12");
    await clickElement(within(dialog).getByRole("button", { name: /Artikel speichern/ }));
    await waitFor(() => expect(requestBody("/api/catalog/articles/article-bandage", "PATCH")).toEqual({
      name: "Verbandpäckchen groß",
      unit: "Stück",
      manufacturer: "MediSafe",
      manufacturerPartNumber: "VB-2000",
      category: "Verbandmaterial",
      barcode: "040000000099",
      articleUrl: "https://shop.example.org/articles/verbandpaeckchen-gross",
      sterile: true,
      medicalDevice: true,
      stkRequired: true,
      stkIntervalMonths: 12,
      mtkRequired: false,
      storageNotes: "Trocken lagern",
      notes: "Einzeln steril verpackt",
      criticalDefault: false
    }));
  });

  it("submits new locations from the dedicated lagerorte tab modal", async () => {
    stubFetch(baseAdminRoutes());
    await renderAppAt("/admin/master-data/locations");
    await screen.findByRole("heading", { name: "Stammdaten" });
    await clickElement(await screen.findByRole("button", { name: /Lagerort hinzufügen/ }));
    const dialog = await screen.findByRole("dialog", { name: "Lagerort anlegen" });
    await changeValue(within(dialog).getByLabelText("Name"), "Raum 3");
    await changeValue(within(dialog).getByLabelText("Typ"), "ROOM");
    await clickElement(within(dialog).getByRole("button", { name: /Lagerort anlegen/ }));
    await waitFor(() => expect(postedBody("/api/catalog/locations")).toEqual({ name: "Raum 3", kind: "ROOM" }));
  });

  it("revises templates from the dedicated vorlagen tab modal", async () => {
    stubFetch({ ...baseAdminRoutes(), "/api/catalog/templates": [{ ...kit.template, positions: [{ id: "pos-bandage", articleId: "article-bandage", articleName: "Verbandpäckchen mittel", moduleName: "Verband", requiredQuantity: 1, unit: "Stück", critical: false }] }] });
    await renderAppAt("/admin/master-data/templates");
    await screen.findByRole("heading", { name: "Stammdaten" });
    await clickElement(await screen.findByRole("button", { name: /Bearbeiten/ }));
    const dialog = await screen.findByRole("dialog", { name: "Rucksackvorlage bearbeiten" });
    await changeValue(within(dialog).getByLabelText("Sollmenge"), "2");
    await clickElement(within(dialog).getByRole("button", { name: /Neue Version speichern/ }));
    await waitFor(() => expect(postedBody("/api/catalog/templates/template-san-a-v1/revise")).toEqual({ positions: [{ articleId: "article-bandage", moduleName: "Verband", requiredQuantity: 2, critical: false }] }));
  });

  it("opens the new devices tab", async () => {
    stubFetch(baseAdminRoutes());
    await renderAppAt("/admin/master-data/articles");
    await screen.findByRole("heading", { name: "Stammdaten" });
    await clickElement(screen.getByRole("tab", { name: "Geräte" }));
    expect(await screen.findByRole("button", { name: /Gerät hinzufügen/ })).toBeInTheDocument();
  });

  it("restores the active master-data tab and device filters from the URL", async () => {
    stubFetch({
      ...baseAdminRoutes(),
      "/api/catalog/devices": [
        {
          id: "device-1",
          name: "Corpuls C3",
          articleId: article.id,
          locationId: location.id,
          serialNumber: "SER-1",
          inventoryNumber: "INV-1",
          lastStkAt: null,
          lastMtkAt: null,
          stkIntervalMonths: null,
          mtkIntervalMonths: null,
          active: false,
          notes: null,
          article,
          location
        }
      ]
    });
    await renderAppAt("/admin/master-data/devices?active=inactive");
    await screen.findByLabelText("Status");
    expect(screen.getByRole("tab", { name: "Geräte" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Status")).toHaveValue("inactive");
    expect(screen.getByText("Corpuls C3")).toBeInTheDocument();

    await clickElement(screen.getByRole("button", { name: "Filter zurücksetzen" }));
    await waitFor(() => expect(getActiveRouter()?.state.location.pathname).toEqual("/admin/master-data/devices"));
    expect(getActiveRouter()?.state.location.search).toEqual({});
  });

  it("soft-deletes master data entries after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    stubFetch({
      ...baseAdminRoutes(),
      "/api/catalog/articles/article-bandage": { ok: true },
      "/api/catalog/locations/loc-main": { ok: true },
      "/api/catalog/templates/template-san-a-v1": { ok: true }
    });
    await renderAppAt("/admin/master-data/articles");
    await screen.findByRole("button", { name: /Verbandpäckchen mittel löschen/ });

    await clickElement(screen.getByRole("button", { name: /Verbandpäckchen mittel löschen/ }));
    await clickElement(screen.getByRole("tab", { name: "Lagerorte" }));
    await clickElement(await screen.findByRole("button", { name: /Hauptlager löschen/ }));
    await clickElement(screen.getByRole("tab", { name: "Rucksackvorlagen" }));
    await clickElement(await screen.findByRole("button", { name: /Sanitätsrucksack A v1 löschen/ }));

    await waitFor(() => {
      expect(wasRequested("/api/catalog/articles/article-bandage", "DELETE")).toBe(true);
      expect(wasRequested("/api/catalog/locations/loc-main", "DELETE")).toBe(true);
      expect(wasRequested("/api/catalog/templates/template-san-a-v1", "DELETE")).toBe(true);
    });
  });

  it("redirects the base stammdaten route to articles", async () => {
    stubFetch(baseAdminRoutes());
    await renderAppAt("/admin/master-data");
    await screen.findByRole("heading", { name: "Stammdaten" });
    await waitFor(() => expect(getActiveRouter()?.state.location.pathname).toEqual("/admin/master-data/articles"));
    expect(screen.getByRole("tab", { name: "Artikel" })).toHaveAttribute("aria-selected", "true");
  });

  it("separates article badges from row buttons for stable list layout", async () => {
    stubFetch({
      ...baseAdminRoutes(),
      "/api/catalog/articles": [{
        ...article,
        medicalDevice: true,
        stkRequired: true,
        stkIntervalMonths: 12,
        mtkRequired: true,
        mtkIntervalMonths: 24,
        criticalDefault: true
      }]
    });
    await renderAppAt("/admin/master-data/articles");
    const articleName = await screen.findByText("Verbandpäckchen mittel");
    const row = articleName.closest(".article-list-row");
    expect(row).not.toBeNull();
    expect(row?.querySelector(".article-row-badges")).not.toBeNull();
    expect(row?.querySelector(".row-action-buttons")).not.toBeNull();
    expect(within(row as HTMLElement).getByText("MPDG")).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText("STK 12M")).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText("MTK 24M")).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText("kritisch")).toBeInTheDocument();
    expect(within(row as HTMLElement).getByRole("link", { name: "Link" })).toHaveAttribute("href", "https://shop.example.org/articles/verbandpaeckchen-mittel");
    expect(within(row as HTMLElement).getByRole("button", { name: "Bearbeiten" })).toBeInTheDocument();
    expect(within(row as HTMLElement).getByRole("button", { name: /Verbandpäckchen mittel löschen/ })).toBeInTheDocument();
  });
});

function baseAdminRoutes() {
  return {
    "/api/auth/setup/status": { initialized: true, firstAdminEmail: "admin@rescuebase.local" },
    "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
    "/api/catalog/articles": [article],
    "/api/catalog/locations": [location],
    "/api/catalog/templates": [kit.template],
    "/api/catalog/devices": []
  };
}
