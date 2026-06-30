import { expect, test } from "@playwright/test";

const adminEmail = process.env.RESCUEBASE_E2E_ADMIN_EMAIL ?? "admin@rescuebase.local";
const adminName = process.env.RESCUEBASE_E2E_ADMIN_NAME ?? "Admin";
const adminPassword = process.env.RESCUEBASE_E2E_ADMIN_PASSWORD ?? "rescuebase-admin";
const apiBaseUrl = process.env.RESCUEBASE_E2E_API_URL ?? "http://localhost:3000";

test("authenticate admin for responsive smoke tests", async ({ request }) => {
  const login = await request.post(`${apiBaseUrl}/auth/login`, {
    data: { email: adminEmail, password: adminPassword }
  });

  if (!login.ok()) {
    const createFirstAdmin = await request.post(`${apiBaseUrl}/auth/setup/first-admin`, {
      data: { email: adminEmail, displayName: adminName, password: adminPassword }
    });
    expect(createFirstAdmin.ok()).toBeTruthy();
  }

  const session = await request.get(`${apiBaseUrl}/auth/session`);
  expect(session.ok()).toBeTruthy();
  await request.storageState({ path: "e2e/.auth/admin.json" });
});
