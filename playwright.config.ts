import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit",
      testMatch: ["transmission.spec.ts", "proof.spec.ts"],
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: [{
    command:
      "pnpm --filter playground build && pnpm --filter playground preview --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 120_000,
  }, {
    command: "pnpm preview:transmission",
    url: "http://127.0.0.1:4175/proof.html",
    reuseExistingServer: false,
    timeout: 120_000,
  }],
});
