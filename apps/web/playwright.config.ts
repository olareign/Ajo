import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Small Android phone first (docs/project-plan.md, Definition of Done).
    ...devices["Pixel 5"],
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
  webServer: {
    command: `pnpm next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    // Production mode refuses to start without these; the API itself is never called by these tests.
    env: {
      API_BASE_URL: "https://api.ajo.invalid",
      SESSION_SECRET: "e2e-only-secret-e2e-only-secret-0123456789",
    },
  },
});
