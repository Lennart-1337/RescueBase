import { screen, waitFor, within } from "@testing-library/react";
import { article, kit, location } from "../test-support/fixtures";
import { changeValue, clickElement, postedBody, renderAppAt, requestBody, resetTestBrowser, stubFetch } from "../test-support/app-test-helpers";

describe("MasterDataPage", () => {
  afterEach(resetTestBrowser);

  it("submits new articles from the admin master data screen", async () => {
    stubFetch(baseAdminRoutes());
    await renderAppAt("/admin/master-data");
    await screen.findByRole("heading", { name: "Stammdaten" });
    await clickElement(await screen.findByRole("button", { name: /Artikel hinzufügen/ }));
    const dialog = await screen.findByRole("dialog", { name: "Artikel anlegen" });
    await changeValue(within(dialog).getByLabelText("Name"), "Rettungsdecke");
    await changeValue(within(dialog).getByLabelText("Einheit"), "Stück");
    await changeValue(within(dialog).getByLabelText("Hersteller"), "Acme Medical");
    await changeValue(within(dialog).getByLabelText("Kategorie"), "Verbrauchsmaterial");
    await changeValue(within(dialog).getByLabelText("Barcode/DataMatrix"), "040000000099");
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
    await renderAppAt("/admin/master-data");
    await screen.findByRole("heading", { name: "Stammdaten" });
    await clickElement(await screen.findByRole("button", { name: /Bearbeiten/ }));
    const dialog = await screen.findByRole("dialog", { name: "Artikel bearbeiten" });
    await changeValue(within(dialog).getByLabelText("Name"), "Verbandpäckchen groß");
    await changeValue(within(dialog).getByLabelText("Hersteller"), "MediSafe");
    await changeValue(within(dialog).getByLabelText("Hersteller-Art.-Nr."), "VB-2000");
    await changeValue(within(dialog).getByLabelText("Barcode/DataMatrix"), "040000000099");
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
    await renderAppAt("/admin/master-data");
    await screen.findByRole("heading", { name: "Stammdaten" });
    await clickElement(screen.getByRole("tab", { name: "Lagerorte" }));
    await clickElement(await screen.findByRole("button", { name: /Lagerort hinzufügen/ }));
    const dialog = await screen.findByRole("dialog", { name: "Lagerort anlegen" });
    await changeValue(within(dialog).getByLabelText("Name"), "Raum 3");
    await changeValue(within(dialog).getByLabelText("Typ"), "ROOM");
    await clickElement(within(dialog).getByRole("button", { name: /Lagerort anlegen/ }));
    await waitFor(() => expect(postedBody("/api/catalog/locations")).toEqual({ name: "Raum 3", kind: "ROOM" }));
  });

  it("revises templates from the dedicated vorlagen tab modal", async () => {
    stubFetch({ ...baseAdminRoutes(), "/api/catalog/templates": [{ ...kit.template, positions: [{ id: "pos-bandage", articleId: "article-bandage", articleName: "Verbandpäckchen mittel", moduleName: "Verband", requiredQuantity: 1, unit: "Stück", critical: false }] }] });
    await renderAppAt("/admin/master-data");
    await screen.findByRole("heading", { name: "Stammdaten" });
    await clickElement(screen.getByRole("tab", { name: "Rucksackvorlagen" }));
    await clickElement(await screen.findByRole("button", { name: /Bearbeiten/ }));
    const dialog = await screen.findByRole("dialog", { name: "Rucksackvorlage bearbeiten" });
    await changeValue(within(dialog).getByLabelText("Sollmenge"), "2");
    await clickElement(within(dialog).getByRole("button", { name: /Neue Version speichern/ }));
    await waitFor(() => expect(postedBody("/api/catalog/templates/template-san-a-v1/revise")).toEqual({ positions: [{ articleId: "article-bandage", moduleName: "Verband", requiredQuantity: 2, critical: false }] }));
  });
});

function baseAdminRoutes() {
  return {
    "/api/auth/setup/status": { initialized: true, firstAdminEmail: "admin@rescuebase.local" },
    "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
    "/api/catalog/articles": [article],
    "/api/catalog/locations": [location],
    "/api/catalog/templates": [kit.template]
  };
}
