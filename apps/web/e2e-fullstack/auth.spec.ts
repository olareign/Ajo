/**
 * Opt-in: drives the real web app against a real, running API (not mocks).
 *
 *   1. Start the API on http://localhost:4000 with a local Postgres and Redis (docker compose up -d), migrated.
 *      Start it with TRUST_PROXY_HOPS=1: the API limits attempts per address, the web app's server is
 *      one address for everyone, and the tests that call the API directly send their own
 *      X-Forwarded-For so they do not use up the sign-in allowance (10 per 15 minutes).
 *   2. Start the web app: API_BASE_URL=http://localhost:4000 SESSION_SECRET=<32+ chars> pnpm next dev -p 3100
 *      Always give it a fixed SESSION_SECRET: without one, development makes a random secret per bundle,
 *      and the code screen (a page) cannot open the cookie the sign-in route (a handler) sealed.
 *      Per-person limits and sign-in alerts (optional): give the API BFF_SHARED_SECRET and the web app the same
 *      value (32+ characters), and set E2E_BFF=1 here. Every test then visits from its own address, as Vercel
 *      would report it, and the tests that check the recorded address and device run.
 *      Bot check (optional): run the API with BOT_CHECK=turnstile and TURNSTILE_SECRET_KEY, the web app with
 *      TURNSTILE_SITE_KEY, and set E2E_TURNSTILE=1 here. Cloudflare's published test keys work and need no
 *      account: site key 1x00000000000000000000AA, secret 1x0000000000000000000000000000000AA (always pass).
 *      If a dev server already holds this folder, run another from a copy, or set E2E_BASE_URL.
 *   3. Run it, telling it how to reach the database (the real email links only exist in the API's outbox,
 *      so the test does what a link does in the database). The command gets SQL on standard input:
 *        E2E_PSQL_COMMAND='docker exec -i <postgres> psql -U ajo -d ajo -tA' pnpm test:e2e:fullstack
 */
import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const psql = process.env.E2E_PSQL_COMMAND;
const bff = Boolean(process.env.E2E_BFF);

/** The address Vercel would report for a visitor: a different one for every test. */
const visitorIp = () => `102.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
test.beforeEach(async ({ context, baseURL }) => {
  const ip = visitorIp();
  // Only for our own origin: a custom header on another site's requests would need its permission.
  await context.route(`${baseURL}/**`, (route) =>
    route.continue({ headers: { ...route.request().headers(), "x-real-ip": ip } }),
  );
});
test.skip(!psql, "Set E2E_PSQL_COMMAND to run the full-stack tests against a real API.");

const sql = (text: string) => execSync(psql!, { input: text }).toString().trim();
const alert = (page: Page) => page.locator("p[role=alert]");
const password = "ember7 river QUILT 93 harbor";
/** Direct API sign-ups carry some token: ignored by the stand-in check, accepted by Cloudflare's test secret. */
const E2E_BOT_TOKEN = "e2e-bot-token";

async function signUp(page: Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Your name").fill("Ada Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/check-email/);
}
const confirmEmail = (email: string) =>
  sql(`update users set email_verified = true, email_verified_at = now() where email = '${email}'`);

test("sign up, get sent to check your email until verified, then sign in and out against the real API", async ({
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

  // Signing in before confirming the email sends the person to "check your email": the API has
  // just sent a fresh link, and the page offers another once the minute is up.
  await page.clock.install();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/check-email\?e=.*from=sign-in/);
  await expect(page.getByText("Please confirm your email before you sign in.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Resend email" })).toBeDisabled();
  expect(
    Number(
      sql(
        `select count(*) from email_verification_tokens t join users u on u.id = t.user_id where u.email = '${email}'`,
      ),
    ),
  ).toBe(1);

  // After the wait, "Resend email" asks the API (through the BFF) for a second link.
  sql(
    `update email_verification_tokens set created_at = created_at - interval '2 minutes' where user_id = (select id from users where email = '${email}')`,
  );
  await page.clock.fastForward(61_000);
  await page.getByRole("button", { name: "Resend email" }).click();
  await expect(page.getByRole("status")).toContainText("We've sent a new link");
  expect(
    Number(
      sql(
        `select count(*) from email_verification_tokens t join users u on u.id = t.user_id where u.email = '${email}'`,
      ),
    ),
  ).toBe(2);

  // A wrong password gives the generic message, and no email.
  await page.getByRole("link", { name: "Back to sign in" }).click();
  await page.getByLabel("Email").fill(email);
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

type ApiJson = {
  accessToken?: string;
  secret?: string;
  recoveryCodes?: string[];
  wallets?: unknown[];
  items?: unknown[];
};
const apiUrl = process.env.E2E_API_URL ?? "http://localhost:4000";
async function api(
  path: string,
  init: { method?: string; token?: string; body?: object; userAgent?: string } = {},
) {
  const res = await fetch(`${apiUrl}/api/v1${path}`, {
    method: init.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`,
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      ...(init.userAgent ? { "User-Agent": init.userAgent } : {}),
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
    (
      await api("/auth/sign-up", {
        body: { email, password, displayName: "Ada MFA", botToken: E2E_BOT_TOKEN },
      })
    ).status,
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
    // This test is about the code screen itself, so it declines to be remembered: every sign-in asks.
    await page.getByRole("checkbox", { name: /Don.t ask again/i }).uncheck();
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

  // Not onboarded yet, so Today sends them to the scenes that show how Àjọ works, then the questions.
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Save on your own");
  await page.waitForTimeout(900);
  await page.screenshot({ path: "e2e/screenshots/onboarding-scene-solo.png" });
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("take turns");
  await page.waitForTimeout(900);
  await page.screenshot({ path: "e2e/screenshots/onboarding-scene-circle.png" });
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Everyone is checked");
  await page.waitForTimeout(1600);
  await page.screenshot({ path: "e2e/screenshots/onboarding-scene-trust.png" });
  await page.getByRole("button", { name: "Let's set you up" }).click();

  await page.getByRole("radio", { name: /Nigeria/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: /Save with a circle/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Pick a handle: a name the company keeps is refused with ideas, a free one is taken.
  // The longest a handle can be, to see that it still fits in the circle.
  const handle = `${uniqueHandle()}_ajo_savers_circle`.slice(0, 20);
  await expect(page.getByRole("heading", { name: "Pick your handle" })).toBeVisible();
  await page.getByLabel("Username").fill("support");
  await expect(page.getByText("@support is taken.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  await page.getByLabel("Username").fill(handle);
  await expect(page.getByText(`@${handle} is yours to take.`)).toBeVisible();
  await page.screenshot({ path: "e2e/screenshots/onboarding-handle.png" });
  await page.getByRole("button", { name: "Continue" }).click();

  // Answers are saved as they are given: reloading part-way picks up at the PIN, without the scenes.
  await expect(page.getByRole("heading", { name: "Choose a PIN" })).toBeVisible();
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: "Choose a PIN" })).toBeVisible();
  await expect(page.getByText("Step 1 of 2")).toBeVisible();

  const enter = async (digits: string) => {
    for (const d of digits) await page.getByRole("button", { name: d, exact: true }).click();
  };
  // The number pad spans the screen, edge to edge with the main button under it.
  const pad = (await page.getByRole("group", { name: /PIN|pad/i }).boundingBox())!;
  const action = (await page.getByRole("button", { name: "Continue" }).boundingBox())!;
  expect(Math.abs(pad.x - action.x)).toBeLessThan(1.5);
  expect(Math.abs(pad.width - action.width)).toBeLessThan(1.5);
  await page.screenshot({ path: "e2e/screenshots/onboarding-pin.png" });

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
  expect(sql(`select username from users where email = '${email}'`)).toBe(handle);
  expect(
    sql(
      `select pin_hash like '$argon2id$%' from transaction_pins p join users u on u.id = p.user_id where u.email = '${email}'`,
    ),
  ).toBe("t");
});

/** A username nobody has used: short enough for the 20-character limit, different on every call. */
const uniqueHandle = () => `e${Date.now().toString(36)}${randomInt(1000)}`;

/** An account that has confirmed its email and finished onboarding, made through the API. */
async function onboardedAccount(email: string) {
  expect(
    (
      await api("/auth/sign-up", {
        body: { email, password, displayName: "Ada Wallet", botToken: E2E_BOT_TOKEN },
      })
    ).status,
  ).toBe(202);
  confirmEmail(email);
  const { accessToken } = (await api("/auth/login", { body: { email, password } })).data;
  expect(
    (
      await api("/me/profile", {
        method: "PUT",
        token: accessToken,
        body: { country: "NG", goal: "both" },
      })
    ).status,
  ).toBe(204);
  expect(
    (
      await api("/me/username", {
        method: "PUT",
        token: accessToken,
        body: { username: uniqueHandle() },
      })
    ).status,
  ).toBe(204);
  expect(
    (await api("/me/pin", { method: "PUT", token: accessToken, body: { pin: "493817" } })).status,
  ).toBe(204);
  return accessToken!;
}

/**
 * Money in the ledger the way the API will one day put it there: each posting is one database
 * transaction of two balanced entries (the ledger refuses anything else).
 */
function seedLedger(email: string, stamp: string) {
  const mine = (kind: string) =>
    `(select a.id from ledger_accounts a join users u on u.id = a.owner_id where u.email = '${email}' and a.currency = 'NGN' and a.kind = '${kind}')`;
  const settlement = `(select id from ledger_accounts where owner_type = 'system' and currency = 'NGN' and kind = 'settlement' and ref = '${stamp}')`;
  let n = 0;
  const post = (type: string, from: string, to: string, amount: number) => `
    begin;
    with t as (insert into ledger_transactions (type, idempotency_key) values ('${type}', '${stamp}-${n++}') returning id)
    insert into ledger_entries (transaction_id, account_id, currency, amount, direction)
      select t.id, ${from}, 'NGN', ${amount}, 'debit' from t
      union all select t.id, ${to}, 'NGN', ${amount}, 'credit' from t;
    commit;`;
  sql(`
    begin;
    insert into ledger_accounts (owner_type, owner_id, currency, kind)
      select 'user', id, 'NGN', k from users, unnest(array['available', 'locked', 'savings']) k where email = '${email}';
    insert into ledger_accounts (owner_type, currency, kind, ref) values ('system', 'NGN', 'settlement', '${stamp}');
    commit;`);
  // 25 rows in all: more than one page of 20.
  for (let i = 0; i < 21; i++) sql(post("funding", settlement, mine("available"), 20_000));
  sql(post("funding", settlement, mine("available"), 250_000));
  sql(post("withdrawal", mine("available"), settlement, 100_000));
  sql(post("lock_deposit", mine("available"), mine("locked"), 50_000));
}

test("the wallet shows the real ledger: balances, a page of activity, then the rest; another person sees none of it", async ({
  page,
}) => {
  const stamp = `e2e${Date.now()}`;
  const email = `e2e+wallet${Date.now()}@example.com`;
  await onboardedAccount(email);
  seedLedger(email, stamp);

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/today$/);

  // Today glances at the wallet and leads to it. Available: 21 x 200 + 2,500 - 1,000 - 500 = 5,200.
  const card = page.getByRole("link", { name: /wallet/i });
  await expect(card).toContainText("₦5,200");
  await card.click();
  await expect(page).toHaveURL(/\/wallet$/);

  const naira = page.getByRole("region", { name: "Nigerian Naira wallet" });
  await expect(naira).toContainText("₦5,200");
  await expect(naira.getByText("Locked").locator("xpath=following-sibling::dd")).toHaveText("₦500");
  await expect(naira.getByText("Savings").locator("xpath=following-sibling::dd")).toHaveText("₦0");

  // 25 entries come as 20, then 5 more on request, and the button goes away at the end.
  const rows = page.getByRole("list", { name: "Recent activity" }).getByRole("listitem");
  await expect(rows).toHaveCount(20);
  await page.getByRole("button", { name: "Show more" }).click();
  await expect(rows).toHaveCount(25);
  await expect(page.getByRole("button", { name: "Show more" })).toHaveCount(0);

  const withdrawal = rows.filter({ hasText: "Withdrawal" });
  await expect(withdrawal).toContainText("Money out");
  await expect(withdrawal).toContainText("-₦1,000");
  await expect(rows.filter({ hasText: "Lock deposit" })).toHaveCount(2);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
  await page.screenshot({ path: "e2e/screenshots/wallet.png" });

  // Someone else, signed in with their own token, gets an empty wallet and no history: the API
  // reads the owner from the session, never from the request.
  const other = await onboardedAccount(`e2e+nomoney${Date.now()}@example.com`);
  expect((await api("/wallet", { method: "GET", token: other })).data.wallets).toEqual([]);
  expect((await api("/wallet/transactions", { method: "GET", token: other })).data.items).toEqual(
    [],
  );
});

test("with the bot check on, sign-up sends Cloudflare's token and still ends at check-your-email", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_TURNSTILE,
    "Needs BOT_CHECK=turnstile on the API and TURNSTILE_SITE_KEY on the web app (see the top of this file).",
  );
  const bodies: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/auth/sign-up")) bodies.push(request.postData() ?? "");
  });

  await page.goto("/sign-up");
  await page.getByLabel("Your name").fill("Ada Human");
  await page.getByLabel("Email").fill(`e2e+human${Date.now()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill(password);
  // The button waits for Cloudflare's check, which loads its own script and frame under our CSP.
  // Cloudflare can take several seconds under automation, so wait longer than the usual 5.
  await expect(page.getByRole("button", { name: "Create account" })).toBeEnabled({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/check-email/);

  expect(JSON.parse(bodies[0]!).botToken).toBeTruthy();
});

test("Me shows who you are, and signing out of all devices ends the session on every other device too", async ({
  page,
}) => {
  const email = `e2e+me${Date.now()}@example.com`;
  const otherDevice = await onboardedAccount(email); // a session on another device, from the API
  const handle = sql(`select username from users where email = '${email}'`);

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/today$/);

  await page.getByRole("link", { name: "Me" }).click();
  await expect(page).toHaveURL(/\/me$/);
  const card = page.getByRole("region", { name: "Your membership" });
  await expect(card).toContainText(`@${handle}`);
  await expect(card).toContainText(email);
  await expect(card).toContainText("Confirmed");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "e2e/screenshots/me.png" });
  // A long email must not push the page wider than the phone.
  const sideways = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
  expect(await sideways()).toBe(0);

  expect((await api("/me", { method: "GET", token: otherDevice })).status).toBe(200);
  await page.getByRole("button", { name: "Sign out of all devices" }).click();
  await expect(page.getByText(/signs you out everywhere/i)).toBeVisible();
  await page.screenshot({ path: "e2e/screenshots/me-confirm.png" });
  expect(await sideways()).toBe(0);
  await page.getByRole("button", { name: "Sign out everywhere" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  // The other device's session is over too, and nothing is left open for this person.
  expect((await api("/me", { method: "GET", token: otherDevice })).status).toBe(401);
  expect(
    Number(
      sql(
        `select count(*) from sessions s join users u on u.id = s.user_id where u.email = '${email}' and s.revoked_at is null`,
      ),
    ),
  ).toBe(0);
  await page.goto("/me");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("the person's own address and device reach the API, and a different kind of device is flagged", async ({
  page,
}) => {
  test.skip(
    !bff,
    "Needs BFF_SHARED_SECRET on both the API and the web app, and E2E_BFF=1 (see the top).",
  );
  const email = `e2e+device${Date.now()}@example.com`;
  await onboardedAccount(email);
  sql(`delete from login_devices where user_id = (select id from users where email = '${email}')`);

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/today$/);

  // Through the web server, yet recorded as this browser, from this visitor's address (not the server's).
  const latest = sql(
    `select host(s.ip) || ' | ' || s.user_agent from sessions s join users u on u.id = s.user_id where u.email = '${email}' order by s.created_at desc limit 1`,
  );
  expect(latest).toMatch(/^102\.\d+\.\d+\.\d+ \| .*Android.*Chrome/);

  // The very first device is recorded quietly; a different kind of device is new, and is flagged.
  const iphone =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
  await api("/auth/login", { body: { email, password }, userAgent: iphone });
  const devices = sql(
    `select string_agg(d.label || ':' || (d.alerted_at is not null), ' ; ' order by d.first_seen_at) from login_devices d join users u on u.id = d.user_id where u.email = '${email}'`,
  );
  expect(devices).toBe("Chrome on Android:false ; Safari on iPhone:true");
});

test("a person turns the authenticator app on from Today, is asked for a code only on a new device, and turns it off", async ({
  page,
}) => {
  // A long journey, and the first visit to each page compiles it in a development server.
  test.setTimeout(120_000);
  const email = `e2e+lock${Date.now()}@example.com`;
  await onboardedAccount(email);
  const sideways = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
  const type = async (digits: string) => {
    for (const d of digits)
      await page
        .getByRole("group", { name: "Number pad" })
        .getByRole("button", { name: d, exact: true })
        .click();
  };
  const signIn = async () => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
  };

  await signIn();
  await expect(page).toHaveURL(/\/today$/);
  // Today also offers to put the app on the home screen (and shows the icon people will get).
  await expect(page.getByRole("region", { name: "Install Àjọ" })).toBeVisible();
  await expect(page.getByRole("img", { name: "The Àjọ app icon" })).toBeVisible();
  expect(await sideways()).toBe(0);
  await page.waitForTimeout(500);
  await page.screenshot({ path: "e2e/screenshots/today-install.png" });
  // Until it is on, Today says why it matters and leads there.
  await page.getByRole("link", { name: /Add a second lock/ }).click();
  await expect(page).toHaveURL(/\/me\/security$/);
  await expect(page.getByRole("heading", { name: "Add a second lock" })).toBeVisible();
  expect(await sideways()).toBe(0);
  await page.getByRole("button", { name: "Start" }).click();

  // The real secret the API made, shown as a QR code and as text.
  await expect(page.getByRole("img", { name: /QR code/i })).toBeVisible();
  const keyText = await page.locator("p.font-mono").first().innerText();
  const secret = keyText.replace(/\s/g, "");
  expect(secret).toMatch(/^[A-Z2-7]{32}$/);
  expect(await sideways()).toBe(0);
  await page.waitForTimeout(800);
  await page.screenshot({ path: "e2e/screenshots/second-lock-scan.png" });
  await page.getByRole("button", { name: "I've added it" }).click();

  // A wrong code is refused with the API's message; the right one turns it on.
  await type("000000");
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(alert(page)).toContainText("That code is incorrect.");
  await type(authenticatorCode(secret));
  await page.getByRole("button", { name: "Confirm" }).click();

  // The ten spare keys, once, and the way out is closed until they are saved.
  await expect(page.getByRole("heading", { name: "Keep your spare keys" })).toBeVisible();
  const keys = await page
    .getByRole("list", { name: "Recovery codes" })
    .getByRole("listitem")
    .allInnerTexts();
  const recoveryCodes = keys.map((k) => k.replace(/^\d+\s*/, "").trim());
  expect(recoveryCodes).toHaveLength(10);
  expect(recoveryCodes[0]).toMatch(/^[a-z0-9]{5}-[a-z0-9]{5}$/);
  expect(await sideways()).toBe(0);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "e2e/screenshots/second-lock-keys.png" });
  await expect(page.getByRole("button", { name: "Done" })).toBeDisabled();
  // Download really produces a file with all ten (the strict content policy must not get in the way).
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("ajo-recovery-codes.txt");
  const file = readFileSync((await download.path())!, "utf8");
  for (const code of recoveryCodes) expect(file).toContain(code);
  await page.getByRole("checkbox", { name: /saved these codes/i }).check();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page).toHaveURL(/\/me$/);
  await expect(page.getByRole("link", { name: /Authenticator app/ })).toContainText("On");

  // The phone that turned it on is remembered: signing in here again does not ask for a code.
  await page.evaluate(() => fetch("/api/auth/sign-out", { method: "POST" }));
  await signIn();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("link", { name: /second lock/i })).toHaveCount(0);

  // A device nobody has vouched for is asked. A spare key works once; declining to be remembered
  // means the next sign-in asks again.
  const forget = async () => {
    await page.evaluate(() => fetch("/api/auth/sign-out", { method: "POST" }));
    await page.context().clearCookies({ name: "ajo_device" });
  };
  await forget();
  await signIn();
  await expect(page).toHaveURL(/\/sign-in\/verify$/);
  await page.getByRole("checkbox", { name: /Don.t ask again/i }).uncheck();
  await page.getByRole("button", { name: "Use a recovery code" }).click();
  await page.getByLabel("Recovery code").fill(recoveryCodes[0]!);
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page).toHaveURL(/\/today$/);

  await page.evaluate(() => fetch("/api/auth/sign-out", { method: "POST" }));
  await signIn();
  await expect(page).toHaveURL(/\/sign-in\/verify$/);
  await page.getByRole("button", { name: "Use a recovery code" }).click();
  await page.getByLabel("Recovery code").fill(recoveryCodes[0]!);
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(alert(page)).toContainText("That code is incorrect.");

  // This time it is remembered: one spare key, then no more questions on this device.
  await page.getByLabel("Recovery code").fill(recoveryCodes[1]!);
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page).toHaveURL(/\/today$/);
  await page.evaluate(() => fetch("/api/auth/sign-out", { method: "POST" }));
  await signIn();
  await expect(page).toHaveURL(/\/today$/);

  // Turning it off needs the password and a fresh code; a wrong password keeps the person signed in.
  await page.goto("/me/security");
  await expect(page.getByRole("heading", { name: "Your second lock is on" })).toBeVisible();
  await page.getByRole("button", { name: "Turn off", exact: true }).click();
  await page.getByLabel("Password", { exact: true }).fill("not the password at all");
  await page.getByLabel("Code from your app").fill(authenticatorCode(secret, 1));
  await page.getByRole("button", { name: "Turn off the second lock" }).click();
  await expect(alert(page)).toContainText("That password is incorrect.");
  await expect(page).toHaveURL(/\/me\/security$/);
  expect(await sideways()).toBe(0);

  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Turn off the second lock" }).click();
  await expect(page).toHaveURL(/\/me$/);
  await expect(page.getByRole("link", { name: /Authenticator app/ })).toContainText("Set up");
  expect(
    sql(
      `select count(*) from user_mfa m join users u on u.id = m.user_id where u.email = '${email}'`,
    ),
  ).toBe("0");
});

test("the passport and money screens are reachable but locked until partners connect, and a preview walks every step without saving anything", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const email = `e2e+passport${Date.now()}@example.com`;
  await onboardedAccount(email);
  const sideways = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
  const shot = async (name: string) => {
    await page.waitForTimeout(700);
    await page.screenshot({ path: `e2e/screenshots/${name}.png` });
  };

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/today$/);

  // Today invites; the passport is there, but every stamp is locked and says why.
  await page.getByRole("link", { name: /passport/i }).click();
  await expect(page).toHaveURL(/\/verify$/);
  await expect(page.getByRole("heading", { name: "Your Àjọ passport" })).toBeVisible();
  await expect(page.getByText(/isn.t switched on yet/i)).toBeVisible();
  const passport = page.getByRole("region", { name: "Your Àjọ passport" });
  await expect(passport.getByRole("link")).toHaveCount(0);
  expect(await sideways()).toBe(0);
  await shot("passport-locked");

  // The real API says the same, for this person only.
  const kyc = await page.evaluate(async () => (await fetch("/api/kyc")).json());
  expect(kyc).toMatchObject({ connected: false, status: "not_started", country: "NG" });
  const rails = await page.evaluate(async () => (await fetch("/api/wallet/rails")).json());
  expect(rails).toEqual({
    country: "NG",
    currency: "NGN",
    kycApproved: false,
    connected: { fund: false, mandate: false, withdraw: false },
  });

  await page.goto("/verify/id");
  await expect(page.getByText("Not switched on yet")).toBeVisible();
  await expect(page.getByRole("button", { name: "Check my ID" })).toHaveCount(0);

  // The preview: every stamp, with nothing sent.
  await page.getByRole("link", { name: "Preview this step" }).click();
  await expect(page.getByText(/Preview: nothing here is saved or sent/)).toBeVisible();
  await page.getByRole("radio", { name: /National ID/ }).click();
  await page.getByLabel("NIN").fill("12345678901");
  await page.getByRole("button", { name: "Check my ID" }).click();
  await expect(page.getByRole("heading", { name: "Your ID stamped" })).toBeVisible();
  await shot("passport-stamp-moment");
  await page.getByRole("link", { name: "Next: Your face" }).click();

  await page.getByRole("button", { name: "I'm ready" }).click();
  await expect(page.getByRole("heading", { name: "Your face stamped" })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("link", { name: "Next: Your address" }).click();

  await page.getByRole("radio", { name: /Bank statement/ }).click();
  await page.getByLabel(/Choose a photo or PDF/).setInputFiles({
    name: "statement.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("not really a pdf"),
  });
  await page.getByRole("button", { name: "Send document" }).click();
  await expect(page.getByRole("heading", { name: "Your address stamped" })).toBeVisible();
  await page.getByRole("link", { name: "Next: Your area" }).click();

  await page.getByRole("button", { name: "Share my location" }).click();
  await expect(page.getByText("Ikeja, Lagos")).toBeVisible();
  await page.getByRole("button", { name: "Use this area" }).click();
  await expect(page.getByRole("heading", { name: "Your area stamped" })).toBeVisible();
  await page.getByRole("link", { name: "Next: Your bank" }).click();

  await page.getByLabel("Bank").selectOption("058");
  await page.getByLabel("Account number").fill("0123456789");
  await page.getByRole("button", { name: "Check the name" }).click();
  await expect(page.getByText("ADA WALLET")).toBeVisible();
  await page.getByRole("button", { name: "Use this account" }).click();
  await expect(page.getByRole("heading", { name: "Your bank stamped" })).toBeVisible();
  await page.getByRole("link", { name: "See my passport" }).click();

  await expect(page.getByText("Passport approved")).toBeVisible();
  expect(await sideways()).toBe(0);
  await shot("passport-approved");
  await page.getByRole("link", { name: "Add your BVN" }).click();
  await expect(page).toHaveURL(/\/verify\/national_check/);
  await page.getByLabel("BVN", { exact: true }).fill("22334455667");
  await page.getByRole("button", { name: "Add my BVN" }).click();
  await expect(page.getByRole("heading", { name: "Your BVN stamped" })).toBeVisible();

  // The money screens: locked for real, open in a preview.
  await page.goto("/wallet");
  await page.getByRole("link", { name: "Add money" }).click();
  await expect(page.getByText("Not switched on yet")).toBeVisible();
  await shot("add-money-locked");
  await page.getByRole("link", { name: "Preview the flow" }).click();
  await page.getByRole("radio", { name: /Debit card/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: "₦10,000" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await shot("add-money-review");
  await page.getByRole("button", { name: "Add money" }).click();
  await expect(page.getByRole("heading", { name: "Money added" })).toBeVisible();
  expect(await sideways()).toBe(0);
  await shot("add-money-done");

  await page.goto("/wallet/withdraw?preview=1");
  await page.getByRole("button", { name: "Withdraw everything" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await shot("withdraw-review");
  await page.getByRole("button", { name: "Continue" }).click();
  for (const digit of "493817") {
    await page
      .getByRole("group", { name: "Transaction PIN" })
      .getByRole("button", { name: digit, exact: true })
      .click();
  }
  await page.getByRole("button", { name: "Send it" }).click();
  await expect(page.getByRole("heading", { name: "Money arrived" })).toBeVisible({
    timeout: 15_000,
  });
  await shot("withdraw-arrived");

  await page.goto("/wallet/mandate?preview=1");
  await page.getByRole("button", { name: "Set up auto-debit" }).click();
  await expect(page.getByText("Active")).toBeVisible({ timeout: 10_000 });
  await shot("mandate-active");

  await page.goto("/wallet/limits?preview=1");
  await expect(page.getByText("You are here")).toBeVisible();
  expect(await sideways()).toBe(0);
  await shot("limits");

  // Nothing real happened: the API still knows nothing, and the database holds no verification rows.
  const after = await page.evaluate(async () => (await fetch("/api/kyc")).json());
  expect(after).toMatchObject({ connected: false, status: "not_started", tier: 0 });
  expect(
    sql(
      `select count(*) from kyc_steps k join users u on u.id = k.user_id where u.email = '${email}'`,
    ),
  ).toBe("0");
});

test("an approved person sees their result, and Today stops asking", async ({ page }) => {
  const email = `e2e+approved${Date.now()}@example.com`;
  await onboardedAccount(email);
  for (const step of ["id", "selfie", "address", "location", "bank"]) {
    sql(
      `insert into kyc_steps (user_id, step, status) select id, '${step}', 'approved' from users where email = '${email}'`,
    );
  }
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("link", { name: /passport/i })).toHaveCount(0);
  await page.goto("/verify");
  await expect(page.getByText("Passport approved")).toBeVisible();
  const passport = page.getByRole("region", { name: "Your Àjọ passport" });
  await expect(passport.getByRole("img", { name: /approved/ })).toHaveCount(5);
  await page.waitForTimeout(800);
  await page.screenshot({ path: "e2e/screenshots/passport-real-approved.png" });
});
