import { expect, test } from "@playwright/test";

test("public QR/NFC check can be completed", async ({ page }) => {
  await page.goto("/check/SAN-RS-001-ZUGANG-2026");
  await expect(page.getByRole("heading", { name: "Rucksack Fahrzeug 1" })).toBeVisible();
  await page.getByLabel("Ist verringern").first().click();
  await expect(page.getByText("Bedingt einsatzbereit").first()).toBeVisible();
  await page.getByLabel("Prüfername").fill("Mara Müller");
  const canvas = page.getByLabel("Unterschriftenfeld");
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error("Unterschriftenfeld nicht sichtbar");
  }
  await page.mouse.move(box.x + 30, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 90);
  await page.mouse.up();
  await page.getByRole("button", { name: "Check abschließen" }).click();
  await expect(page.getByRole("heading", { name: "Check abgeschlossen" })).toBeVisible();
  await expect(page.getByText(/Nachfüllauftrag .+ wurde erzeugt\./)).toBeVisible();
});
