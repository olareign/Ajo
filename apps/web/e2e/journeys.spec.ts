import { expect, test } from "@playwright/test";

test("a new user goes from onboarding to a solo savings plan", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Save money to achieve your goals" }),
  ).toBeVisible();
  await page.screenshot({ path: "e2e/screenshots/onboarding.png" });
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("link", { name: "Get Started" }).click();

  await page.getByLabel("Plan Name").fill("Aso Ebi");
  await page.getByRole("button", { name: "Proceed" }).click();
  await page.getByRole("radio", { name: "5,000", exact: true }).click();
  await page.getByRole("radio", { name: "Weekly" }).click();
  await page.screenshot({ path: "e2e/screenshots/plan-amount.png" });
  await page.getByRole("button", { name: "Proceed" }).click();
  await page.getByRole("radio", { name: "1 year" }).click();
  await page.getByRole("button", { name: "Proceed" }).click();

  await expect(page.getByRole("heading", { name: "Your selections" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Plan summary" })).toContainText("Deposits53");
  await page.screenshot({ path: "e2e/screenshots/plan-review.png" });
  await page.getByRole("button", { name: "Proceed" }).click();
  await expect(page.getByRole("heading", { name: "Nice one Boss!" })).toBeVisible();
});

test("groups list switches between private and public groups", async ({ page }) => {
  await page.goto("/groups");
  await expect(page.getByRole("heading", { name: "Aso Ebi" })).toBeVisible();
  await page.screenshot({ path: "e2e/screenshots/groups.png" });
  await page.getByRole("tab", { name: "Public Groups" }).click();
  await expect(page.getByRole("heading", { name: "Plot of Land" })).toBeVisible();
});

test("pages fit a phone screen without sideways scrolling", async ({ page }) => {
  for (const path of ["/", "/savings/new", "/groups"]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBe(0);
  }
});
