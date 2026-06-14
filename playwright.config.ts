import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry"
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } }
  ],
  webServer: [
    {
      command: "npm run dev:api",
      port: 3000,
      reuseExistingServer: true
    },
    {
      command: "npm run dev:web",
      port: 5173,
      reuseExistingServer: true
    }
  ]
});
