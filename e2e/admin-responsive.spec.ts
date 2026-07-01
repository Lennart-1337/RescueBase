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

  test("tablet keeps the sidebar visible on master-data routes", async ({ page }, testInfo) => {
    test.skip(!["tablet", "tablet-landscape"].includes(testInfo.project.name));
    await page.goto("/admin/master-data/locations");
    await expect(page.getByRole("link", { name: "Stammdaten" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Menü öffnen" })).toBeHidden();
  });

  test("tablet does not stretch the master-data header gap", async ({ page }, testInfo) => {
    test.skip(!["tablet", "tablet-landscape"].includes(testInfo.project.name));
    await page.goto("/admin/master-data/locations");
    await expect(page.getByRole("heading", { level: 1, name: "Stammdaten", exact: true })).toBeVisible();
    await expect(page.locator(".tab-list")).toBeVisible();
    const spacing = await page.evaluate(() => {
      const heading = document.querySelector("h1");
      const tabs = document.querySelector(".tab-list");
      if (!heading || !tabs) return null;
      const headingBox = heading.getBoundingClientRect();
      const tabsBox = tabs.getBoundingClientRect();
      return Math.round(tabsBox.top - headingBox.bottom);
    });
    expect(spacing).not.toBeNull();
    expect(spacing as number).toBeLessThanOrEqual(24);
  });

  test("tablet stacks the inventory header actions below the title", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "tablet");
    await page.goto("/admin/inventory");
    await expect(page.getByRole("heading", { level: 1, name: "Lager", exact: true })).toBeVisible();
    const header = page.locator(".inventory-page-header");
    await expect(header).toBeVisible();
    await expect(header).toHaveCSS("flex-direction", "column");
  });

  test("tablet landscape keeps inventory dialogs within the modal bounds", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "tablet-landscape");
    await page.goto("/admin/inventory");

    await page.getByRole("button", { name: "Charge hinzufügen" }).click();
    const createDialog = page.getByRole("dialog", { name: "Charge erfassen" });
    await expect(createDialog).toBeVisible();
    const createOverflow = await createDialog.evaluate((dialog) => dialog.scrollWidth - dialog.clientWidth);
    expect(createOverflow).toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: "Dialog schließen" }).click();

    await page.getByRole("button", { name: "Korrigieren" }).first().click();
    const correctionDialog = page.getByRole("dialog", { name: "Chargenkorrektur" });
    await expect(correctionDialog).toBeVisible();
    const correctionOverflow = await correctionDialog.evaluate((dialog) => dialog.scrollWidth - dialog.clientWidth);
    expect(correctionOverflow).toBeLessThanOrEqual(1);
  });

  test("tablet landscape keeps dashboard order text in the default body color", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "tablet-landscape");
    await page.goto("/");
    const rowColor = await page.locator(".order-row").first().evaluate((element) => getComputedStyle(element).color);
    expect(rowColor).toBe("rgb(23, 32, 44)");
  });

  test("tablet landscape keeps purchase order line cards readable", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "tablet-landscape");
    await page.goto("/admin/purchase-orders");
    await page.getByRole("link", { name: "Bearbeiten" }).first().click();
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.locator(".purchase-order-line-price").first()).toBeVisible();
  });

  test("tablet landscape keeps the device dialog date fields inside the modal", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "tablet-landscape");
    await page.goto("/admin/master-data/devices");
    await page.getByRole("button", { name: "Gerät hinzufügen" }).click();
    const dialog = page.getByRole("dialog", { name: "Gerät anlegen" });
    await expect(dialog).toBeVisible();
    const overflow = await dialog.evaluate((element) => element.scrollWidth - element.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
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

  test("article dialog removes the feature divider on narrow layouts", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop");
    await page.goto("/admin/master-data/articles");
    await page.getByRole("button", { name: "Artikel hinzufügen" }).click();
    const flagsSection = page.getByRole("region", { name: "Artikelmerkmale" });
    await expect(flagsSection).toBeVisible();
    await expect(flagsSection).toHaveCSS("border-left-width", "0px");
  });
});
