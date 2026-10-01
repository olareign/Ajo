/**
 * Opt-in: drives the real web app against a real, running API (not mocks).
 *
 *   1. Start the API on http://localhost:4000 with a local Postgres and Redis (docker compose up -d), migrated.
 *   2. Start the web app: API_BASE_URL=http://localhost:4000 SESSION_SECRET=<32+ chars> pnpm next dev -p 3100
 *   3. Run it, telling it how to reach the database (the real email links only exist in the API's outbox,
 *      so the test does what a link does in the database). The command gets SQL on standard input:
 *        E2E_PSQL_COMMAND='docker exec -i <postgres> psql -U ajo -d ajo -tA' pnpm test:e2e:fullstack
 */
import { createHash, randomBytes } from "node:crypto";
import { execSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";

const psql = process.env.E2E_PSQL_COMMAND;
test.skip(!psql, "Set E2E_PSQL_COMMAND to run the full-stack tests against a real API.");

const sql = (text: string) => execSync(psql!, { input: text }).toString().trim();
const alert = (page: Page) => page.locator("p[role=alert]");
const password = "ember7 river QUILT 93 harbor";

async function signUp(page: Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Your name").fill("Ada Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/check-email/);
}
const confirmEmail = (email: string) =>
  sql(`update users set email_verified_at = now() where email = '${email}'`);

test("sign up, get refused until verified, then sign in and out against the real API", async ({
  page,
  context,
}) => {
  const email = `e2e+${Date.now()}@example.com`;

  // The main action sits at the bottom of the screen, where the thumb is, with the footer line under it.
  await page.goto("/sign-up");
  const bottomGap = async (locator: ReturnType<Page["locator"]>) => {
    const box = (await locator.boundingBox())!;
    return page.viewportSize()!.height - (box.y + box.height);
  };
  expect(await bottomGap(page.getByText("Already have an account?"))).toBeLessThan(64);
  expect(await bottomGap(page.getByRole("button", { name: "Create account" }))).toBeLessThan(140);

  await signUp(page, email);

  // Signing in before confirming the email is refused, with the API's own message shown.
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(alert(page)).toContainText("Verify your email before signing in.");

  // A wrong password gives the generic message.
  await page.getByLabel("Password", { exact: true }).fill("not the right password at all");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(alert(page)).toContainText("Email or password is incorrect.");

  confirmEmail(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/today/);
  const session = (await context.cookies()).find((c) => c.name === "ajo_session");
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Strict");

  const status = await page.evaluate(
    async () => (await fetch("/api/auth/sign-out", { method: "POST" })).status,
  );
  expect(status).toBe(204);
  await page.goto("/today");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("recover a forgotten password: ask for a link, choose a new password, sign in with it", async ({
  page,
}) => {
  const email = `e2e+reset${Date.now()}@example.com`;
  await signUp(page, email);
  confirmEmail(email);

  // Asking for a link goes through the BFF to the API, which records a hashed single-use token.
  await page.goto("/sign-in");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send me email" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  const issued = sql(
    `select count(*) from password_reset_tokens t join users u on u.id = t.user_id where u.email = '${email}'`,
  );
  expect(Number(issued)).toBe(1);

  // The emailed link only exists in the API's outbox, so stand in for it with a token we know.
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  sql(
    `insert into password_reset_tokens (user_id, token_hash, expires_at)
     select id, '${hash}', now() + interval '1 hour' from users where email = '${email}'`,
  );

  await page.goto(`/reset-password?token=${token}`);
  await page.getByLabel("New password").fill("short");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(alert(page)).toContainText("at least 12 characters");
  const fresh = "Lagos-Mango-Drum-4721-Tide";
  await page.getByLabel("New password").fill(fresh);
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByRole("heading", { name: "Password changed" })).toBeVisible();

  // The old password no longer works; the new one does.
  await page.getByRole("link", { name: "Sign in" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(alert(page)).toContainText("Email or password is incorrect.");
  await page.getByLabel("Password", { exact: true }).fill(fresh);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/today/);

  // The link works once only.
  await page.goto(`/reset-password?token=${token}`);
  await page.getByLabel("New password").fill("Another-Long-Phrase-882-Reed");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(alert(page)).toContainText("invalid or has expired");
  await expect(page.getByRole("link", { name: "Ask for a new link" })).toBeVisible();
});

test("the code screen is only for a sign-in that is waiting for its second step", async ({
  page,
}) => {
  await page.goto("/sign-in/verify");
  await expect(page).toHaveURL(/\/sign-in$/);
});
