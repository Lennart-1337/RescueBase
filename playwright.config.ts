import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  workers: 1,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry"
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/admin.json" }
    },
    {
      name: "tablet",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        hasTouch: true,
        isMobile: true,
        storageState: "e2e/.auth/admin.json",
        viewport: { width: 768, height: 1024 }
      }
    },
    {
      name: "tablet-landscape",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        hasTouch: true,
        isMobile: true,
        storageState: "e2e/.auth/admin.json",
        viewport: { width: 1180, height: 820 }
      }
    },
    {
      name: "phone-small",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        hasTouch: true,
        isMobile: true,
        storageState: "e2e/.auth/admin.json",
        viewport: { width: 375, height: 667 }
      }
    },
    {
      name: "phone-large",
      dependencies: ["setup"],
      use: { ...devices["Pixel 7"], storageState: "e2e/.auth/admin.json" }
    }
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
