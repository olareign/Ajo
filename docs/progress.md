# Àjọ — Progress Checklist

Oct 3, 2026 · @olareign

The live status of every bullet in the [project plan](project-plan.md), by phase. The plan says what must be true; this page says what is. It is audited against the code, the tests and the live deployment, not against memory. Update it in the same pull request as the work.

| Mark | Meaning |
| --- | --- |
| ✅ | Done and working: built, automated tests pass, checked against the real API |
| 🟡 | Partly done: the note says what works and what is missing |
| ❌ | Failing, or built but defective: the note names the defect |
| ⬜ | Not started |
| ☐ / ☑ | **Your hand test** on the Vercel build, on a phone. Tick it when you have proved it yourself; a feature is only finished when its box is ticked and its pull request is merged |

## Where things stand (Oct 3, 2026)

| Check | Result |
| --- | --- |
| Web production (Vercel `ajo-web`) | Ready, serving `main` at `f00625a` (PR #13). Every merge into `main` deploys |
| Web automated tests | 552 unit and component tests pass; lint, typecheck and format clean |
| API automated tests (`ajo-api`) | 192 unit and 157 integration tests pass against real Postgres and Redis |
| Full-stack browser tests | Default mode: 6 pass, 1 skipped. With the bot check on (real Cloudflare test keys): 7 of 7. Needs a dev server with a fixed `SESSION_SECRET`. The E1.8 and E1.5 journey (turn on, remembered phone, new device asked, spare key, untick, turn off) passes against the real API and Postgres, and so do the other eight with per-person limits on (Oct 4) |
| Live database | Has the boolean `email_verified` column (proved through the live API on Oct 3). The other migrations are not individually checked: run `ajo-api/scripts/sql/bring-database-up-to-date.sql` on Neon to be sure |
| API on Render (`ajo-api`) | Live and healthy (database and Redis up, docs off) at https://ajo-api-78oq.onrender.com, serving `main` at `314be73` (PR #10). Free plan, deploys on every commit to `main`, about 35 s to wake from sleep. No worker service exists |
| Vercel settings | Production and Preview have `API_BASE_URL` (the Render URL above) and `SESSION_SECRET` |

## Phase 0: foundations

Engineering gate (P0.6–P0.10, P0.12, P0.13) must close before Phase 1 is called finished. Business gate (P0.1–P0.5, P0.11) must close before real money moves.

| ID | Item | Mark | Note |
| --- | --- | --- | --- |
| P0.1 | Product spec open questions | ⬜ | Deposit size, trust rule, payout fee, early-spot rule, app name: all unanswered. **You** |
| P0.2 | Launch countries and legal review | ⬜ | **You** and legal |
| P0.3 | Partners and sandbox keys | 🟡 | Partners chosen; no sandbox keys yet. Mail and password-check adapters exist with stand-ins for tests |
| P0.4 | Brand | 🟡 | Colours, fonts and logo are in code. Name ("Àjọ" or "Alajo") undecided. The intro circle shows eight real human photos (Nappy, credited in `public/people/CREDITS.md`), with a person silhouette, never initials, for any bead without one. Release forms for the people shown are unchecked: legal, with P0.11 |
| P0.5 | UX flows and prototype | 🟡 | Sign-in, sign-up, code, solo savings and groups drawn. KYC, funding, withdrawal and friends are not; no user testing |
| P0.6 | Design system | 🟡 | Tokens and components in code; Figma component library unconfirmed |
| P0.7 | Repositories and standards | ✅ | Both repositories |
| P0.8 | CI/CD and environments | 🟡 | Web: CI plus Vercel deploy working. API: live on Render (free plan, created in the dashboard, not from the Blueprint). The free plan has no pre-deploy command, so migrations do not run on deploy, and there is no worker, so E1.10's housekeeping is not running live. Staging split not confirmed |
| P0.9 | Database, migrations, seed data | 🟡 | Nine migrations run in tests and on empty databases; the hand-run SQL script is verified. No seed data for local development |
| P0.10 | Observability | ⬜ | No error tracker, no uptime check |
| P0.11 | Terms and privacy drafts | ⬜ | **You** and legal |
| P0.12 | Security baseline | 🟡 | CSP and headers (tested), CI audit and secret scan, CodeQL, `SECURITY.md` are in the repository. Branch protection and private vulnerability reporting cannot be seen from here: **you** confirm |
| P0.13 | API skeleton | ✅ | |

## Phase 1: identity and wallet

### E1. Authentication and onboarding

| ID | Feature | Mark | Hand test | Note |
| --- | --- | --- | --- | --- |
| E1.1 | Sign up with email and password | ✅ | ☐ | Works: 12+ characters, breach check, argon2id, single-use expiring link, same answer whether or not the email exists, **bot protection (Cloudflare Turnstile, built Oct 3; fails closed; widget only shows when Cloudflare needs the person)**. Defects D1 and D3 below are fixed (D1 is live once the shared secret is set); reset emails are limited to one a minute and ten a day per address. Needs the Render and Vercel settings in To-dos before it can go live |
| E1.2 | Profile basics | ✅ | ☐ | Name and email saved, email confirmed by link, and a **username** (3 to 20 lowercase letters, digits or underscores, unique whatever the capitals, enforced by the database; chosen once during setup; changing it comes with account settings, not built). Taken names and names the company keeps get one refusal; two people claiming one name get exactly one winner. Needs the SQL script run on Neon first (see To-dos) |
| E1.3 | Transaction PIN | ✅ | ☐ | Set once, verified, five tries then a 15-minute lock. "Required for money actions" waits for E3.5. No change-PIN yet (planned with settings) |
| E1.4 | Login and sessions | ✅ | ☐ | Built Oct 3: lockout, expiry, rotating refresh tokens with theft detection and a 10-second grace window (two requests at once no longer end the session, D2), a session limit, **new-device alert** (an email when a different kind of browser or system signs in; the first device and returning ones are silent; at most five a day), **sign out of all devices** on the new **Me** screen (with a confirmation), and per-person rate limits and the real device on every session (D1). **D1 only takes effect once you set the shared secret on both Render and Vercel** (see To-dos); until then everything behaves as before |
| E1.5 | Device binding (Should) | ✅ | ☐ | Built Oct 4: with the authenticator on, a sign-in from a **device that is not remembered** asks for a code, and the owner is emailed about a new kind of device (E1.4). A device is remembered after a correct code if "Don't ask again on this device" stays ticked (it is, by default): the browser keeps a random secret in a cookie JavaScript cannot read, the API keeps only its hash, and it works for 30 days of use (up to ten devices). The phone that turns the authenticator on is remembered straight away. **Remembered devices are forgotten** on sign out of all devices, a password reset, and turning the authenticator off. Money actions still ask for a code every time (E1.8). Needs the SQL script run on Neon first (adds `trusted_devices`) |
| E1.6 | Onboarding screens | 🟡 | ☐ | Built: three animated scenes that show how solo saving and èsúsú work, then country, goal, handle and PIN, resumable and saved step by step. **Remaining:** "then led to KYC" (waits for E2) and the country freeze once KYC starts (D4) |
| E1.7 | Install as app (PWA) | 🟡 | ☐ | Manifest served; icons now show the **whole Àjọ logo** (they used to cut out the "À" and most of the "j"): plain 192 and 512, a separate maskable one with room for Android's circle, the iPhone icon, and the pig-and-coin mark for the browser tab, with a test that fails if the logo is ever cropped again. Android's splash is built from this icon and the white background. **Install prompt (Oct 4):** a card on Today ("Put Àjọ on your home screen") that offers the browser's install dialog, or the by-hand steps on iPhone and when the browser holds its dialog back; *Not now* hides it for a day, not for good, and **Me → The app → Install Àjọ on this phone** is always there until it is installed. **Not built:** iPhone splash screens (they need an image per device size). Installing on Android and iPhone is for your hand test |
| E1.8 | Authenticator-app second factor | ✅ | ☐ | Built Oct 3: the **Second lock** screens (Me, then Authenticator app): a QR code drawn in the browser plus the same key as text, a code to prove it works, then the ten one-use recovery codes on a ticket, shown once, with Copy and Download, and you cannot finish until you tick that you saved them. Turning it off needs your password and a fresh code, and a typo does not sign you out. Today nudges until it is on. At sign-in the code is asked only on a new device (E1.5). On the API, **any route marked `@MoneyAction()` refuses until the app is on (403 `mfa_enrolment_required`) and needs a fresh code in the `X-Ajo-Mfa-Code` header (a code works once; ten wrong ones lock for 15 minutes)**. No money route exists yet, so the gate is proved on a stand-in route: **the first real one (E3.5) must carry `@MoneyAction()`** |
| E1.9 | Confirm email again | ✅ | ☐ | Resend after a minute, ten a day, `email_verified` boolean kept in step by the database |
| E1.10 | Housekeeping of sessions and tokens | ✅ | | Job built and tested. Runs only where the worker is deployed |

### E2. KYC

| ID | Feature | Mark | Note |
| --- | --- | --- | --- |
| E2.1 | ID verification | 🟡 | The screen is built and country-aware (Nigeria: NIN, passport, driver's licence, voter's card; UK: passport, driving licence, residence permit) and **walkable in the Preview**. The real check waits for the identity partner: Smile ID for Nigeria; the UK vendor is undecided |
| E2.2 | Selfie and liveness | 🟡 | Built as a viewfinder with three movements (look straight, turn, smile); the preview never opens the camera. The capture itself will be the partner's camera component |
| E2.3 | Proof of address | 🟡 | Built: choose the document, pick a file (a preview never reads or sends it). Needs a place to keep documents (see the accounts list) |
| E2.4 | Location capture | 🟡 | Built with a plain explanation of what is kept; the preview shows a sample area and never asks the browser. Needs a geocoding account for the area name |
| E2.5 | Bank account | 🟡 | Built: bank and account number (UK: sort code), the bank's name for the account is shown and **must match the ID name** (rule built and tested). The lookup waits for Paystack (Nigeria) or Modulr (UK) |
| E2.6 | National checks (optional) | 🟡 | BVN screen built for Nigeria only; raises the tier. Waits for Smile ID |
| E2.7 | KYC status and retry | 🟡 | Built: a **member passport** with a stamp per step. The API works status and tier out from per-step records (`kyc_steps`); the screen shows not started, in progress, waiting, approved, or refused with the reason and a **Try again** that returns to that stamp. Fills with real results once a partner is connected |
| E2.8 | KYC gate | ✅ | API: any route marked `@RequiresKyc()` refuses with 403 `kyc_required` until every required step is approved (tested on a stand-in route). Web: `KycGate` closes a screen the same way. The first real users are Phase 2 saving, joining, groups and friends, which must carry them |

**How the unconnected screens behave (decided Oct 4).** Nothing is connected yet, so the API reports `connected: false` and every step shows a locked "Not switched on yet" with a **Preview the flow** link. The preview (`?preview=1`) is a walk-through with sample data kept in that browser tab only: it never calls the API, the camera, location or the file system, and the database stays empty (a full-stack test proves it). In production a stand-in partner can never approve a real person, because production refuses stand-ins by design. Each money action also refuses to pretend outside a preview, even once a partner is connected, until its real call is wired. Preview-only samples for reviewers: an ID or BVN ending 0000, an account number ending 0000 (someone else's name) or a file called "blurry" shows a refusal; a withdrawal ending 666 shows a bank refusal being reversed. Defect D4 (country can change any time) still stands until the real KYC steps start.

### E3. Wallet and payments

| ID | Feature | Mark | Hand test | Note |
| --- | --- | --- | --- | --- |
| E3.1 | Ledger core | ✅ | | Double entry, database-level safeguards, idempotency, tests including real Postgres |
| E3.2 | Wallet view | ✅ | ☐ | Balances per currency and paged history, now with Add money, Withdraw, Auto-debit and Your limits within reach |
| E3.3 | Fund wallet | 🟡 | ☐ | Screens built (`/wallet/add`): card, bank transfer (your own account details) and USSD in Nigeria; bank transfer and Direct Debit in the UK; amount pad, receipt, coin landing in the wallet. Walkable in the Preview; the real payment waits for Paystack (Nigeria) and GoCardless or Modulr (UK). Whether the UK needs card funding is an open question |
| E3.4 | Auto-debit mandate | 🟡 | ☐ | Screen built (`/wallet/mandate`): a standing-permission ticket with Not set up, Waiting for your bank, Active and Cancelled, in each country's own words (NIBSS Direct Debit, Bacs Direct Debit); cancel explains it is blocked while a plan or circle needs it (that rule comes with Phase 2). Walkable in the Preview; real mandates wait for Paystack and GoCardless |
| E3.5 | Withdraw to bank | 🟡 | ☐ | Screens built (`/wallet/withdraw`): amount against what is available, receipt, **PIN pad**, then a ticket that follows the money (Received, Sent to your bank, Arrived or Sent back with the reversal shown). Walkable in the Preview (any PIN works there). The real transfer, the real PIN check and `@MoneyAction()` on the route wait for Paystack or Modulr |
| E3.6 | Webhook inbox | ⬜ | | The ledger cannot join an outer database transaction today; settle that design here |
| E3.7 | Daily reconciliation | ⬜ | | Needs E9.1 |
| E3.8 | Limits by KYC tier | 🟡 | ☐ | The ladder screen is built (`/wallet/limits`): not verified, passport stamped, BVN added (Nigeria only), with your rung marked. **The numbers shown in the preview are samples; the real limits are a business decision (P0.1, E11.10) and nothing enforces limits yet** |

## Phases 2 to 6

| Phase | Epics | Mark |
| --- | --- | --- |
| 2 Solo savings | E4 | ⬜ |
| 3 Friends and discovery | E5 | ⬜ |
| 4 Èsúsú groups | E6, E7 | ⬜ |
| 5 Launch readiness | E10 | ⬜ |
| 6 Mobile and new countries | React Native | ⬜ |
| Alongside | E8 notifications: only the email sender exists (⬜ as a service). E9 admin: ⬜. E11 multi-currency: ledger and wallet screens hold several currencies (🟡); the rest ⬜ | |

## Defects found in review

| ID | Defect | Affects | Mark |
| --- | --- | --- | --- |
| D1 | The web server sent no client address, so the API's per-address limits were shared by every user, and sessions recorded the web server's address | E1.1, E1.4, E1.5 | ✅ built; live once the shared secret is set |
| D2 | Two requests at once on an expired access token ended the session | E1.4 | ✅ fixed (grace window) |
| D3 | Password-reset emails have only the shared address limit, so one inbox can be flooded; verification emails already have a per-address limit | E1.1 | ✅ fixed Oct 4: one reset link a minute and ten a day per address (as the plan says); a refused request cancels nothing and answers the same |
| D4 | `PUT /me/profile` lets a person change country at any time | E1.6, E2 | ❌ (until KYC) |

**Plan change proposed Oct 3, awaiting your approval before anything is built:** the four defects are written into the plan as acceptance criteria: D1 and D2 in E1.4, D3 in E1.1, D4 in E1.6. D1 is the prerequisite for the new-device alert and for E1.5.

## Your to-dos

**Hand tests** (on the Vercel build, on a phone, after each pull request merges; tick the boxes above)

1. E1.1 and E1.9: sign up, receive the email, open the link; try "Resend email" before and after the minute.
2. E1.4: sign in with a wrong then the right password; sign out; sign in again.
3. E1.6, E1.2 and E1.3: sign up and sign in as a new person. Watch the three scenes (swipe them; try Skip on another account), choose a country and goal, pick a handle (try a taken or reserved one such as `support`: it must be refused), and finish with a PIN (an easy one must be refused). Close the tab part-way and sign in again: it must pick up where you stopped. An older account (set up before handles) should be asked for the handle only.
4. E1.7: remove any Àjọ icon already on your home screen, then add it again on Android and on iPhone (phones keep the old icon until you do): the whole Àjọ logo must show, not just the ọ. Use the card on Today, or Me → Install Àjọ on this phone, which stays until installed (Chrome shows its own prompt rarely, so do not wait for it). On iPhone the card shows the Share-sheet steps.
5. E3.2: Today shows a wallet card; it opens `/wallet` (empty for a new account; real rows need the ledger seeded).
6. E1.8: on Today tap "Add a second lock". Install an authenticator app (Google Authenticator, Authy or 1Password), scan the square, type the code. Save the ten spare keys (Copy all or Download), tick the box, Done. Sign out and in on the same phone: it must NOT ask for a code. Then sign in from a different browser or device: it must ask, a spare key must work once and then be refused, and with "Don't ask again" ticked that device is not asked next time. Then Me, Authenticator app, Turn off: a wrong password must say so and keep you signed in.
7. E2 and E3 screens: on Today tap "Get your passport stamped". The passport must show every stamp locked and say verification isn't switched on. Tap **Preview the flow** and walk all five stamps (and the BVN), watching each stamp land; then try the refusals (see "How the unconnected screens behave"). Open Wallet and try Add money, Withdraw, Auto-debit and Your limits: each is locked for real and fully walkable in the Preview. Look for anything that overflows sideways or reads oddly on your phone. Nothing you do in a preview is saved.
8. E1.4: sign in on your phone, then in a different browser or on another device: the owner gets a "New sign-in to your Àjọ account" email naming it. Open Today, tap the round person icon (Me), and use "Sign out of all devices": every other device must lose access.

**Merge order for E1.5, E1.7 install prompt, E1.8, D3 and the E2/E3 screens (this release). Sign-in and the passport now read new tables, so the database comes first.**

1. **Neon SQL editor:** run `ajo-api/scripts/sql/bring-database-up-to-date.sql` again. It adds `trusted_devices` (E1.5) and `kyc_steps` (E2.7); verified identical to the migrations and safe to repeat. Without it, signing in with the authenticator on, and the passport, fail.
2. Merge the API pull request; Render deploys it. (If nothing starts within a few minutes, use Manual Deploy, Deploy latest commit.)
3. Merge the web pull request; Vercel deploys it.
4. People who already turned the authenticator on will be asked for a code once on each device, then not again for 30 days.

**Merge order for E1.4 (done). Sign-in now writes to a new table, so the database comes first.**

1. **Neon SQL editor:** run `ajo-api/scripts/sql/bring-database-up-to-date.sql` again (adds `login_devices`; safe to repeat).
2. Merge the API pull request; Render deploys it. (Render has not deployed on its own for the last merge: if nothing happens within a few minutes, use Manual Deploy, Deploy latest commit.)
3. Merge the web pull request; Vercel deploys it.
4. **To switch on per-person limits and real devices (D1):** make one secret with `openssl rand -base64 48`. Put it as `BFF_SHARED_SECRET` in Render (service `ajo-api`, Environment) **and** the same value as `BFF_SHARED_SECRET` in Vercel (project `ajo-web`, Production and Preview), then redeploy both (a variable only reaches new deployments). Without it nothing breaks; the API simply ignores the visitor details. Never paste the secret anywhere else.

**Merge order for E1.2 and E1.6 (done) Order matters: the new API code reads a new column.**

1. **Neon SQL editor:** paste and run `ajo-api/scripts/sql/bring-database-up-to-date.sql`. It adds the `username` column (verified on a database in your live state). Safe to run again.
2. Merge the API pull request. Render deploys it (a minute, plus a cold start).
3. Merge the web pull request. It also carries the Cloudflare-error fix for sign-up.
4. Hand-test (item 3 above). Anyone who already finished setup will be asked for a handle the next time they sign in.

**Merge order for E1.1 (bot protection), already done. Order matters, because the API rejects unknown fields until it has this change and production refuses to start without the bot-check settings**

1. Render, service `ajo-api`, Environment: add `BOT_CHECK` = `turnstile` and `TURNSTILE_SECRET_KEY` = the widget's **secret** key (not the site key). Do this first.
2. Vercel, project `ajo-web`, Environment Variables (Production and Preview): add `TURNSTILE_SITE_KEY` = `0x4AAAAAAFM0tH6uB0tllz7t`. The old web code ignores it.
3. Merge the API pull request (`phase-1/identity-and-wallet` in `ajo-api`). Render deploys it. From now until step 4, sign-ups on the live site are refused ("please complete the check"): keep the gap short.
4. Merge the web pull request. Vercel deploys it, and the sign-up form shows the check.
5. Hand-test E1.1 on your phone, then tick it.

**Bot protection on the live site: two things only you can do (found Oct 3)**

- **Cloudflare, Turnstile, your widget, Hostname management:** add `ajo-web-dusky.vercel.app` (and `ajo-web-abdulrasaq-taofeeqs-projects.vercel.app`; add `localhost` for local work). Until you do, Cloudflare refuses the page (console error 110200) and sign-up cannot complete. Preview URLs change per build and are not covered: test on the production address.
- **Vercel:** a variable you add reaches only *new* deployments, so redeploy after adding or changing one.

**Partner accounts for E2 and E3 (researched Oct 4; prices from public pages, so confirm before signing).** Sandboxes are free and self-serve for most; live keys need a registered business in that country (Paystack's Direct Debit is Nigeria-based businesses only). Never paste a key anywhere but the Render and Vercel dashboards.

| Need | Option | Tag | Why |
| --- | --- | --- | --- |
| Identity, Nigeria (E2.1, E2.2, E2.6) | **Smile ID** | **Recommended**, free sandbox, paid usage | One vendor for ID document, selfie and liveness, and BVN and NIN lookups |
| Identity, Nigeria | Dojah or Prembly | Alternative, paid | May be cheaper for NIN and BVN lookups alone; two integrations |
| Identity, UK | Sumsub | **Recommended**, 14-day trial of 50 free checks, then about $1.35–1.85 a verification | Self-serve; can also screen sanctions later |
| Identity, UK | Veriff | Alternative, free sandbox, about $0.80 a check | Cheapest published entry. **Decision: UK vendor left open (Oct 4)** |
| Identity, UK | Onfido (now Entrust) | **Not recommended yet**, paid, sales-led, annual contract | Your documented choice, but quote-only now |
| Document storage (E2.3, E9.2) | **Cloudflare R2** | **Recommended**, free to 10 GB, no egress fees | You already use Cloudflare; S3-compatible |
| Area name from location (E2.4) | **LocationIQ** | **Recommended**, free to 5,000 requests a day | Confirm its terms allow storing the area name. Mapbox and Google restrict storing results unless you pay for permanent geocoding |
| Nigeria money (E2.5, E3.3, E3.4, E3.5, E3.6) | **Paystack** | **Recommended**, free test mode, per-transaction fees | Name check, card, transfer and USSD funding, NIBSS direct debit, payouts and webhooks in one account. Live needs a verified Nigerian business (confirm documents) |
| Nigeria second provider | Flutterwave or Monnify | Later, paid usage | The plan asks for a second adapter per market |
| Nigeria fund holder | A CBN-licensed banking-as-a-service partner | **Do not choose yet**, paid | A legal decision (P0.2) |
| UK collections (E3.3, E3.4) | **GoCardless** | **Recommended**, free sandbox, then about 1% + 20p capped at £4 | Bacs Direct Debit |
| UK holding, payouts, name check (E2.5, E3.5) | **Modulr** | **Recommended**, paid, contract needed (confirm sandbox access) | The plan's fund holder; Confirmation of Payee for the name check |
| UK card funding | Stripe or similar | **Open question**, paid usage | The plan names no UK card provider |
| Background worker for webhooks (E3.6) | Render worker | Needed before E3.6 goes live, paid | The worker is not deployed today |
| Not needed yet | ComplyAdvantage (E11.9), Wise Platform (cross-border), Termii and Twilio (E8) | Defer | |

Create them in this order: Smile ID sandbox, Paystack test mode, GoCardless sandbox, Sumsub trial, R2 bucket, LocationIQ, Modulr.

**Setup only you can do**

- Vercel: decide whether `*.vercel.app` stays behind Vercel sign-in (it is on today, so testers must be signed in to Vercel). `API_BASE_URL` and `SESSION_SECRET` are already set.
- Neon: run `ajo-api/scripts/sql/bring-database-up-to-date.sql`.
- Render: the free plan runs no pre-deploy command, so migrations do not run on deploy: run the SQL script on Neon whenever a migration lands (or move to a paid plan). Decide whether to deploy the worker (E1.10 housekeeping needs it).
- GitHub: switch on branch protection for `main` in both repositories, and private vulnerability reporting.
- Local: create `apps/web/.env.local` with a fixed `SESSION_SECRET` so the code screen and the browser tests work on your dev server.
- Business: P0.1, P0.2, P0.11 answers; partner sandbox keys (KYC, payments); legal release check for the intro photos.

## Branches, commits and pull requests

- **One branch per phase per repository**, named `phase-N/<slug>`. Phase 1 is `phase-1/identity-and-wallet`. A phase branch starts from the latest `main`.
- **One commit per plan bullet**, Conventional Commits with the ID in the scope: `feat(E3.2): wallet screens`. Tests, docs and this page ride in the same commit as the bullet they belong to, or in a `test(...)` or `docs(...)` commit that names the same ID.
- **You merge**: when you have proved a bullet by hand, its pull request goes into `main`, Vercel deploys it, and its hand-test box is ticked.
- Commits carry no AI attribution.

## What is next

By the book, Phase 1 is open. What remains needs outside input:

1. Done and waiting for your hand test: P0.4 photos, E1.1 bot protection and reset limits, E1.2 usernames, E1.4 sessions and alerts, E1.5 new-device code, E1.6 scenes and flow, E1.7 icons and install prompt, E1.8 second lock, and the E2 and E3 screens in Preview.
2. **You:** create the partner accounts above and put each key in Render and Vercel yourself. As each one arrives, I build its adapter behind the existing interface and switch its screens from locked to live, one partner at a time, with its tests against the sandbox: Smile ID first (E2.1, E2.2, E2.6), then Paystack (E2.5, E3.3 to E3.6), then GoCardless and the UK vendor.
3. **Decisions I need from you:** the real limits per tier and country (E3.8, P0.1), whether the UK needs card funding, the UK identity vendor, and the Nigerian fund holder after legal advice (P0.2).
4. Then **E3.6** webhook inbox, **E3.7** reconciliation (needs the admin console, E9.1), and D4 (freeze the country once KYC starts). That closes the Phase 1 gate: a verified user funds and withdraws, and the ledger matches the partner.
