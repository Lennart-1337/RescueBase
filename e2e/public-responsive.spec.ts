import { expect, test } from "@playwright/test";
import { mockLoggedOutSession, mockSetupStatus } from "./support/auth-route-mocks";

test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: "serial" });

test.describe("public/auth responsive smoke", () => {
  test("login screen renders without horizontal overflow", async ({ page }) => {
    await mockSetupStatus(page);
    await mockLoggedOutSession(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Anmelden" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Anmelden" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });

  test("password reset request and confirm screens stay usable", async ({ page }, testInfo) => {
    test.skip(
      !["phone-small", "phone-large"].includes(testInfo.project.name),
      "The full reset flow only needs phone coverage and otherwise exhausts the shared public rate limit across viewport projects.",
    );
    await mockSetupStatus(page);
    await mockLoggedOutSession(page);
    await page.goto("/password-reset");
    await expect(page.getByRole("heading", { name: "Passwort zurücksetzen" })).toBeVisible();
    await page.getByLabel("E-Mail").fill("lager@rescuebase.local");
    await page.getByRole("button", { name: "Reset-Link senden" }).click();
    const debugText = await page.getByText(/Lokaler Reset-Link:/).textContent();
    const resetPath = debugText?.match(/http:\/\/localhost:5173(\/password-reset\/[^\s]+)/)?.[1];
    expect(resetPath).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

    await page.goto(resetPath!);
    await expect(page.getByRole("heading", { name: "Neues Passwort setzen" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Passwort speichern" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });

  test("invitation accept screen stays usable", async ({ browser, page }) => {
    const adminContext = await browser.newContext({ storageState: "e2e/.auth/admin.json", viewport: page.viewportSize() ?? { width: 375, height: 667 } });
    const adminPage = await adminContext.newPage();
    await mockSetupStatus(adminPage);
    await adminPage.goto("/admin/users");
    await adminPage.getByRole("button", { name: "Benutzer einladen" }).click();
    await adminPage.getByLabel("Name").fill("Mobile Test");
    await adminPage.getByLabel("E-Mail").fill(`mobile-smoke-${Date.now()}@rescuebase.local`);
    await adminPage.getByRole("button", { name: "Einladung senden" }).click();
    const inviteText = await adminPage.getByText(/Lokaler Einladungslink:/).textContent();
    const invitePath = inviteText?.match(/http:\/\/localhost:5173(\/invitation\/[^\s]+)/)?.[1];
    expect(invitePath).toBeTruthy();

    const context = await browser.newContext({ viewport: page.viewportSize() ?? { width: 375, height: 667 } });
    const invitePage = await context.newPage();
    await mockSetupStatus(invitePage);
    await mockLoggedOutSession(invitePage);
    await invitePage.goto(invitePath!);
    await expect(invitePage.getByRole("heading", { name: "Einladung annehmen" })).toBeVisible();
    await expect(invitePage.getByRole("button", { name: "Konto aktivieren" })).toBeVisible();
    expect(await invitePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await context.close();
    await adminContext.close();
  });
});
