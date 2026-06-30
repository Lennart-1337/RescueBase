import { expect, test } from "@playwright/test";

const routes = [
  { path: "/", heading: "Nachfüllaufträge", action: "CSV Aufträge", actionRole: "link", hasToolbar: true },
  { path: "/admin/kits", heading: "Rucksäcke", action: "Rucksack hinzufügen", actionRole: "button", hasToolbar: true },
  { path: "/admin/inventory", heading: "Lager", action: "Charge hinzufügen", actionRole: "button", hasToolbar: true },
  { path: "/admin/purchase-orders", heading: "Bestellungen", action: "Bestellung anlegen", actionRole: "link", hasToolbar: true },
  { path: "/admin/master-data/articles", heading: "Stammdaten", action: "Artikel hinzufügen", actionRole: "button", hasToolbar: true },
  { path: "/admin/users", heading: "Benutzer", action: "Benutzer einladen", actionRole: "button", hasToolbar: false }
] as const;

test.describe("admin responsive smoke", () => {
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
});
