import { expect, test } from "@playwright/test";

const adminEmail = process.env.RESCUEBASE_E2E_ADMIN_EMAIL ?? "admin@rescuebase.local";
const adminName = process.env.RESCUEBASE_E2E_ADMIN_NAME ?? "Admin";
const adminPassword = process.env.RESCUEBASE_E2E_ADMIN_PASSWORD ?? "rescuebase-admin";

test("authenticate admin for responsive smoke tests", async ({ page }) => {
  await page.goto("/");

  if (await page.getByRole("heading", { name: "Erstadmin einrichten" }).isVisible().catch(() => false)) {
    await page.getByLabel("Name").fill(adminName);
    await page.getByLabel("E-Mail").fill(adminEmail);
    await page.getByLabel("Passwort").fill(adminPassword);
    await page.getByRole("button", { name: "Erstadmin erstellen" }).click();
  } else {
    await expect(page.getByRole("heading", { name: "Anmelden" })).toBeVisible();
    await page.getByLabel("E-Mail").fill(adminEmail);
    await page.getByLabel("Passwort").fill(adminPassword);
    await page.getByRole("button", { name: "Anmelden" }).click();
  }

  await expect(page.getByRole("heading", { name: "Nachfüllaufträge" })).toBeVisible();
  await page.context().storageState({ path: "e2e/.auth/admin.json" });
});
