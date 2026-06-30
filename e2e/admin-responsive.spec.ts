import { expect, test } from "@playwright/test";
import { mockSetupStatus } from "./support/auth-route-mocks";

const routes = [
  { path: "/", heading: "Nachfüllaufträge", action: "CSV Aufträge", actionRole: "link", hasToolbar: true },
  { path: "/admin/kits", heading: "Rucksäcke", action: "Rucksack hinzufügen", actionRole: "button", hasToolbar: true },
  { path: "/admin/inventory", heading: "Lager", action: "Charge hinzufügen", actionRole: "button", hasToolbar: true },
  { path: "/admin/purchase-orders", heading: "Bestellungen", action: "Bestellung anlegen", actionRole: "link", hasToolbar: true },
  { path: "/admin/purchase-orders/new", heading: "Bestellung anlegen", action: "Position hinzufügen", actionRole: "button", hasToolbar: false },
  { path: "/admin/master-data/articles", heading: "Stammdaten", action: "Artikel hinzufügen", actionRole: "button", hasToolbar: true },
  { path: "/admin/master-data/locations", heading: "Stammdaten", action: "Lagerort hinzufügen", actionRole: "button", hasToolbar: false },
  { path: "/admin/master-data/templates", heading: "Stammdaten", action: "Vorlage hinzufügen", actionRole: "button", hasToolbar: false },
  { path: "/admin/master-data/devices", heading: "Stammdaten", action: "Gerät hinzufügen", actionRole: "button", hasToolbar: true },
  { path: "/admin/users", heading: "Benutzer", action: "Benutzer einladen", actionRole: "button", hasToolbar: false }
] as const;

const secondaryRoutes = [
  { path: "/admin/check-protocols", heading: "Check-Protokolle", label: "Statusbild" },
  { path: "/admin/settings", heading: "App-Einstellungen", label: "E-Mail-Vorlagen" },
  { path: "/admin/account", heading: "Sicherheit", label: "Zugriffsschutz" }
] as const;

test.describe("admin responsive smoke", () => {
  test.beforeEach(async ({ page }) => {
    await mockSetupStatus(page);
  });

  for (const route of routes) {
    test(`${route.path} renders without horizontal overflow`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.getByRole("heading", { level: 1, name: route.heading, exact: true })).toBeVisible();
      await expect(page.getByRole(route.actionRole, { name: route.action })).toBeVisible();

      if (route.hasToolbar) {
        await expect(page.getByRole("search").first()).toBeVisible();
      }

      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth - doc.clientWidth;
      });
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  for (const route of secondaryRoutes) {
    test(`${route.path} stays visible on narrow layouts`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.getByRole("heading", { level: 1, name: route.heading, exact: true })).toBeVisible();
      await expect(page.getByText(route.label, { exact: true })).toBeVisible();

      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth - doc.clientWidth;
      });
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test("mobile navigation drawer stays usable", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes("phone"));
    await page.goto("/");
    await page.getByRole("button", { name: "Menü öffnen" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("link", { name: "Bestellungen" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Menü schließen" })).toBeVisible();
  });

  test("purchase order detail rail actions stay reachable on narrow viewports", async ({ page }) => {
    await page.goto("/admin/purchase-orders");
    await page.getByRole("link", { name: "Bearbeiten" }).first().click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Freigeben" })).toBeVisible();
    await expect(page.getByRole("link", { name: "PDF exportieren" })).toBeVisible();
  });

  test("core admin dialogs stay usable on narrow viewports", async ({ page }) => {
    await page.goto("/admin/users");
    await page.getByRole("button", { name: "Benutzer einladen" }).click();
    await expect(page.getByRole("dialog", { name: "Benutzer einladen" })).toBeVisible();
    await page.getByRole("button", { name: "Dialog schließen" }).click();

    await page.goto("/admin/master-data/articles");
    await page.getByRole("button", { name: "Artikel hinzufügen" }).click();
    await expect(page.getByRole("dialog", { name: "Artikel anlegen" })).toBeVisible();
    await page.getByRole("button", { name: "Dialog schließen" }).click();
  });
});
