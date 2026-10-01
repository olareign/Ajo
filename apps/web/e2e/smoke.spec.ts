import { expect, test } from "@playwright/test";

test("the app loads on a phone with no CSP violations or console errors", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(msg.text());
  });
  page.on("pageerror", (error) => problems.push(error.message));

  const response = await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Àjọ" })).toBeVisible();
  await page.screenshot({ path: "e2e/screenshots/welcome.png" });

  expect(problems).toEqual([]);
  expect(response?.headers()["content-security-policy"]).toContain("'strict-dynamic'");
  expect(response?.headers()["strict-transport-security"]).toContain("max-age=63072000");
  expect(response?.headers()["x-powered-by"]).toBeUndefined();
});

test("the page fits a phone screen without sideways scrolling", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test("the PWA manifest is served", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({ name: "Àjọ", display: "standalone" });
});

test("the welcome screen follows the viewer's dark theme", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "dark", viewport: { width: 393, height: 851 } });
  const page = await context.newPage();
  await page.goto("/");
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe("rgb(13, 17, 48)");
  await page.screenshot({ path: "e2e/screenshots/welcome-dark.png" });
  await context.close();
});
