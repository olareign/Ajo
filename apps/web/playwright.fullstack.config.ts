import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-fullstack",
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    ...devices["Pixel 5"],
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
});
