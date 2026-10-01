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
  const manifest = await response.json();
  expect(manifest).toMatchObject({ name: "Àjọ", display: "standalone" });
  for (const icon of manifest.icons)
    expect((await request.get(icon.src)).ok(), icon.src).toBe(true);
});

test("the app stays white even when the device is set to dark mode", async ({ browser }) => {
  const context = await browser.newContext({
    colorScheme: "dark",
    viewport: { width: 393, height: 851 },
  });
  const page = await context.newPage();
  await page.goto("/");
  for (const path of ["/", "/sign-in", "/sign-up", "/forgot-password"]) {
    await page.goto(path);
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(background, path).toBe("rgb(255, 255, 255)");
  }
  await page.goto("/");
  await page.screenshot({ path: "e2e/screenshots/welcome-dark.png" });
  await context.close();
});

test("the welcome links lead to working sign-up and sign-in screens", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Let's get you started" })).toBeVisible();
  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await page.goto("/today");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("password fields can be shown and hidden with the eye button", async ({ page }) => {
  for (const path of ["/sign-up", "/sign-in"]) {
    await page.goto(path);
    const password = page.getByLabel("Password", { exact: true });
    await password.fill("a long secret phrase");
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(password).toHaveValue("a long secret phrase");
    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(password).toHaveAttribute("type", "password");
  }
});

test("the recovery and code screens load, and the code screen guards itself", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page.getByRole("heading", { name: "Password recovery" })).toBeVisible();
  await page.goto("/reset-password");
  await expect(page.getByText("This link is incomplete")).toBeVisible();
  await page.goto("/sign-in/verify");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("the welcome screen plays its entrance: the circle rolls in and the coin drops", async ({
  page,
}) => {
  await page.goto("/");
  const names = await page.evaluate(() =>
    document.getAnimations().map((a) => (a as CSSAnimation).animationName),
  );
  for (const name of ["ring-slide", "ring-spin", "coin-drop", "twinkle", "rise"]) {
    expect(names, name).toContain(name);
  }
  // It ends where the still design is: the logo, the circle and both buttons are all there.
  await page.waitForFunction(
    () => document.getAnimations().every((a) => a.playState === "finished"),
    null,
    {
      timeout: 8000,
    },
  );
  for (const image of ["ajo-wordmark", "ajo-coin", "ajo-rays"]) {
    const loaded = await page
      .locator(`img[src="/brand/${image}.webp"]`)
      .evaluate((el) => (el as HTMLImageElement).naturalWidth);
    expect(loaded, image).toBeGreaterThan(0);
  }
  await expect(page.getByRole("link", { name: "Create account" })).toBeVisible();
});

test("with reduce-motion on, nothing moves and everything is already in place", async ({
  browser,
}) => {
  const context = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 393, height: 851 },
  });
  const page = await context.newPage();
  await page.goto("/");
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  const opacity = await page.getByRole("link", { name: "Create account" }).evaluate((el) => {
    let node: HTMLElement | null = el as HTMLElement;
    let value = 1;
    while (node) {
      value *= Number(getComputedStyle(node).opacity);
      node = node.parentElement;
    }
    return value;
  });
  expect(opacity).toBe(1);
  await context.close();
});
