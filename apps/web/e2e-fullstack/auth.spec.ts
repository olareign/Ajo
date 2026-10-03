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
import { expect, test, type Page } from "@playwright/test";

const psql = process.env.E2E_PSQL_COMMAND;
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
async function api(path: string, init: { method?: string; token?: string; body?: object } = {}) {
  const res = await fetch(`${apiUrl}/api/v1${path}`, {
    method: init.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`,
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

  // Answers are saved as they are given: reloading part-way picks up at the PIN.
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
