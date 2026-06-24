import { screen, waitFor, within } from "@testing-library/react";
import { batch, kit, order } from "./test-support/fixtures";
import { clickElement, renderAppAt, resetTestBrowser, stubFetch } from "./test-support/app-test-helpers";

describe("RescueBase routes", () => {
  afterEach(resetTestBrowser);

  it("renders the admin dashboard from routed API data", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true, appName: "RescueBase Pro", appSubtitle: "Bereitschaft Nord" },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false }, appName: "RescueBase Pro", appSubtitle: "Bereitschaft Nord" },
      "/api/catalog/kits": [kit],
      "/api/inventory/batches": [batch],
      "/api/replenishment-orders": [order]
    });
    await renderAppAt("/");
    expect(await screen.findByText("RescueBase Pro")).toBeInTheDocument();
    expect(screen.getByText("Bereitschaft Nord")).toBeInTheDocument();
    expect(document.querySelector(".sidebar-main")).not.toBeNull();
    expect(document.querySelector(".sidebar-user")).not.toBeNull();
    expect(await screen.findByRole("heading", { name: "Nachfüllaufträge" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Rucksack Fahrzeug 1/ })).toBeInTheDocument();
    expect(screen.getByText("1 Positionen · Offen")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /CSV Aufträge/ })).toHaveAttribute("href", "/api/reports/csv/replenishment");
  });

  it("opens the mobile navigation in a drawer", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true, appName: "RescueBase Pro", appSubtitle: "Bereitschaft Nord" },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false }, appName: "RescueBase Pro", appSubtitle: "Bereitschaft Nord" },
      "/api/catalog/kits": [kit],
      "/api/inventory/batches": [batch],
      "/api/replenishment-orders": [order]
    });

    await renderAppAt("/");
    await screen.findByRole("heading", { name: "Nachfüllaufträge" });

    await clickElement(screen.getByRole("button", { name: "Menü öffnen" }));

    const drawer = await screen.findByRole("dialog", { name: "Navigation" });
    expect(drawer).toHaveClass("mobile-drawer");
    expect(screen.getByRole("button", { name: "Menü schließen" })).toBeInTheDocument();
    expect(within(drawer).getByRole("link", { name: "Rucksäcke" })).toBeInTheDocument();

    await clickElement(screen.getByRole("button", { name: "Menü schließen" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Navigation" })).toBeNull());
  });

  it("renders the public check route from the token path", async () => {
    stubFetch({
      "/api/public/kits/SAN-RS-001-ZUGANG-2026": { kit, template: { ...kit.template, positions: [
        { id: "pos-bandage", articleId: "article-bandage", articleName: "Verbandpäckchen mittel", moduleName: "Verband", requiredQuantity: 6, unit: "Stück", critical: false },
        { id: "pos-tourniquet", articleId: "article-tourniquet", articleName: "Tourniquet", moduleName: "Blutung", requiredQuantity: 1, unit: "Stück", critical: true },
        { id: "pos-dreiecktuch", articleId: "article-dreiecktuch", articleName: "Dreiecktuch", moduleName: "Verband", requiredQuantity: 2, unit: "Stück", critical: false }
      ] } }
    });
    await renderAppAt("/check/SAN-RS-001-ZUGANG-2026");
    expect(await screen.findByRole("heading", { name: "Rucksack Fahrzeug 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Verband" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Blutung" })).toBeInTheDocument();
  });

  it("does not render seeded fallback data when the API is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    await renderAppAt("/");
    expect(await screen.findByRole("heading", { name: "API nicht verfügbar" })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Rucksack Fahrzeug 1")).not.toBeInTheDocument());
  });
});
