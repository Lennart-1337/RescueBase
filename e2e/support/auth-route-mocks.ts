import type { Page } from "@playwright/test";

const setupStatus = {
  initialized: true,
  appName: "RescueBase",
  appSubtitle: "Sanitätslager",
  showLogo: true,
  showAppName: false,
  showAppSubtitle: true
};

export async function mockSetupStatus(page: Page) {
  await page.route("**/api/auth/setup/status", async (route) => {
    await route.fulfill({ body: JSON.stringify(setupStatus), contentType: "application/json", status: 200 });
  });
}

export async function mockLoggedOutSession(page: Page) {
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({ body: JSON.stringify({ message: "Nicht angemeldet." }), contentType: "application/json", status: 401 });
  });
}
