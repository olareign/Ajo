/**
 * Opt-in: drives the real web app against a real, running API (not mocks).
 *
 *   1. Start the API on http://localhost:4000 with a local Postgres and Redis (docker compose up -d), migrated.
 *   2. Start the web app: API_BASE_URL=http://localhost:4000 SESSION_SECRET=<32+ chars> pnpm next dev -p 3100
 *   3. Run it, telling it how to reach the database (the real email links only exist in the API's outbox,
 *      so the test does what a link does in the database). The command gets SQL on standard input:
 *        E2E_PSQL_COMMAND='docker exec -i <postgres> psql -U ajo -d ajo -tA' pnpm test:e2e:fullstack
 */
import { createHash, createHmac, randomBytes } from "node:crypto";
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
  await expect(page).toHaveURL(/\/(today|onboarding)/);
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
  await expect(page).toHaveURL(/\/(today|onboarding)/);

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

/** RFC 6238, what an authenticator app does: HMAC-SHA1 over the 30-second step, 6 digits. */
function authenticatorCode(base32Secret: string, offsetSteps = 0): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of base32Secret.replace(/=+$/, ""))
    bits += alphabet.indexOf(ch).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000) + offsetSteps));
  const mac = createHmac("sha1", key).update(counter).digest();
  const offset = mac[mac.length - 1]! & 0xf;
  const value = (mac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(value).padStart(6, "0");
}

type ApiJson = { accessToken?: string; secret?: string; recoveryCodes?: string[] };
const apiUrl = process.env.E2E_API_URL ?? "http://localhost:4000";
async function api(path: string, init: { method?: string; token?: string; body?: object } = {}) {
  const res = await fetch(`${apiUrl}/api/v1${path}`, {
    method: init.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  return {
    status: res.status,
    data: res.status === 204 ? {} : ((await res.json()) as ApiJson),
  };
}

test("a sign-in with the authenticator app on: the code screen, a wrong code, the right code, then a recovery code", async ({
  page,
}) => {
  // Set the user up the way the app will: account, confirmed email, authenticator app turned on.
  const email = `e2e+mfa${Date.now()}@example.com`;
  expect(
    (await api("/auth/sign-up", { body: { email, password, displayName: "Ada MFA" } })).status,
  ).toBe(202);
  confirmEmail(email);
  const tokens = (await api("/auth/login", { body: { email, password } })).data;
  const enrol = (await api("/auth/mfa/totp", { token: tokens.accessToken! })).data;
  const confirm = await api("/auth/mfa/totp/confirm", {
    token: tokens.accessToken!,
    body: { code: authenticatorCode(enrol.secret!) },
  });
  expect(confirm.status).toBe(200);
  const recoveryCodes = confirm.data.recoveryCodes!;
  expect(recoveryCodes).toHaveLength(10);

  // Signing in now leads to the code screen instead of Today.
  const signIn = async () => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/sign-in\/verify$/);
  };
  await signIn();
  await expect(page.getByRole("heading", { name: "Verify it's you" })).toBeVisible();
  const confirmButton = page.getByRole("button", { name: "Confirm" });
  await expect(confirmButton).toBeDisabled();

  // A wrong code is refused with the API's message and the boxes clear.
  const type = async (digits: string) => {
    for (const d of digits) await page.getByRole("button", { name: d, exact: true }).click();
  };
  await type("000000");
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();
  await expect(alert(page)).toContainText("That code is incorrect.");
  await expect(page).toHaveURL(/\/sign-in\/verify$/);

  // The right code (the next 30-second step, since this step was used to turn it on) signs in.
  await type(authenticatorCode(enrol.secret!, 1));
  await confirmButton.click();
  await expect(page).toHaveURL(/\/(today|onboarding)/);

  // A fresh sign-in can use a recovery code instead, once.
  await page.evaluate(() => fetch("/api/auth/sign-out", { method: "POST" }));
  await signIn();
  await page.getByRole("button", { name: "Use a recovery code" }).click();
  await page.getByLabel("Recovery code").fill(recoveryCodes[0]!.toUpperCase());
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page).toHaveURL(/\/(today|onboarding)/);

  await page.evaluate(() => fetch("/api/auth/sign-out", { method: "POST" }));
  await signIn();
  await page.getByRole("button", { name: "Use a recovery code" }).click();
  await page.getByLabel("Recovery code").fill(recoveryCodes[0]!);
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(alert(page)).toContainText("That code is incorrect.");
});

test("a new person is taken through onboarding and then lands on Today", async ({ page }) => {
  const email = `e2e+onboard${Date.now()}@example.com`;
  await signUp(page, email);
  confirmEmail(email);
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Not onboarded yet, so Today sends them to the questions.
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole("radio", { name: /Nigeria/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: /Save with a circle/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  const enter = async (digits: string) => {
    for (const d of digits) await page.getByRole("button", { name: d, exact: true }).click();
  };
  // An easy-to-guess PIN is refused by the API, with its reason.
  await enter("123456");
  await page.getByRole("button", { name: "Continue" }).click();
  await enter("123456");
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(alert(page)).toContainText("PIN");

  await enter("493817");
  await page.getByRole("button", { name: "Continue" }).click();
  await enter("493817");
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("heading", { name: "Hello, Ada Tester" })).toBeVisible();

  // Onboarding is done: the questions are no longer reachable, and the API holds the answers.
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/today$/);
  expect(sql(`select country || goal from users where email = '${email}'`)).toBe("NGcircle");
  expect(
    sql(
      `select pin_hash like '$argon2id$%' from transaction_pins p join users u on u.id = p.user_id where u.email = '${email}'`,
    ),
  ).toBe("t");
});
