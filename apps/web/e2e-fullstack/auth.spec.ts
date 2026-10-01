/**
 * Opt-in: drives the real web app against a real, running API (not mocks).
 *
 *   1. Start the API on http://localhost:4000 with a local Postgres and Redis (docker compose up -d).
 *   2. Start the web app: API_BASE_URL=http://localhost:4000 SESSION_SECRET=<32+ chars> pnpm next dev -p 3100
 *   3. Run it, telling it how to mark an email as confirmed (the real link only exists in the API's outbox):
 *        E2E_VERIFY_EMAIL_COMMAND='docker exec <postgres> psql -U ajo -d ajo -c "update users set email_verified_at = now() where email = '"'{email}'"'"' pnpm test:e2e:fullstack
 */
import { execSync } from "node:child_process";
import { expect, test } from "@playwright/test";

const verifyCommand = process.env.E2E_VERIFY_EMAIL_COMMAND;
test.skip(
  !verifyCommand,
  "Set E2E_VERIFY_EMAIL_COMMAND to run the full-stack test against a real API.",
);

const email = `e2e+${Date.now()}@example.com`;
const password = "correct horse battery staple";

test("sign up, get refused until verified, then sign in and out against the real API", async ({
  page,
  context,
}) => {
  // 1. Sign up through the real form and the real API.
  await page.goto("/sign-up");
  await page.getByLabel("Your name").fill("Ada Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  // The main action sits at the bottom of the screen, where the thumb is.
  const button = page.getByRole("button", { name: "Create account" });
  const box = (await button.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(viewport.height - (box.y + box.height)).toBeLessThan(64);
  await button.click();
  await expect(page).toHaveURL(/\/check-email/);

  // 2. Signing in before confirming the email is refused, with the API's own message shown.
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("p[role=alert]")).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in$/);
  console.log("unverified sign-in message:", await page.locator("p[role=alert]").innerText());

  // 3. A wrong password gives the generic message.
  await page.getByLabel("Password", { exact: true }).fill("not the right password at all");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("Email or password is incorrect.");

  // 4. Confirm the email (the link only exists in the fake outbox, so do what the link does in the database).
  execSync(verifyCommand!.replaceAll("{email}", email));

  // 5. Sign in for real: the session cookie is set, httpOnly, and /today opens.
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/today/);
  const cookies = await context.cookies();
  const session = cookies.find((c) => c.name === "ajo_session");
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Strict");
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();

  // 6. Signed out, the cookie goes and /today bounces back to sign-in.
  const status = await page.evaluate(
    async () => (await fetch("/api/auth/sign-out", { method: "POST" })).status,
  );
  expect(status).toBe(204);
  await page.goto("/today");
  await expect(page).toHaveURL(/\/sign-in$/);
});
