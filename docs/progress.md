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
| Web automated tests | 274 unit and component tests pass; lint, typecheck, format and production build clean |
| API automated tests (`ajo-api`) | 138 unit and 114 integration tests pass against real Postgres and Redis |
| Full-stack browser tests | Default mode: 6 pass, 1 skipped. With the bot check on (real Cloudflare test keys): 7 of 7. Needs a dev server with a fixed `SESSION_SECRET` |
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
| E1.1 | Sign up with email and password | 🟡 | ☐ | Works: 12+ characters, breach check, argon2id, single-use expiring link, same answer whether or not the email exists, **bot protection (Cloudflare Turnstile, built Oct 3; fails closed; widget only shows when Cloudflare needs the person)**. Remaining: defects D1 and D3 below. Needs the Render and Vercel settings in To-dos before it can go live |
| E1.2 | Profile basics | 🟡 | ☐ | Name and email saved, email confirmed by link. **Missing: username** (no column, no field; friends search in Phase 3 needs it) |
| E1.3 | Transaction PIN | ✅ | ☐ | Set once, verified, five tries then a 15-minute lock. "Required for money actions" waits for E3.5. No change-PIN yet (planned with settings) |
| E1.4 | Login and sessions | 🟡 | ☐ | Works: lockout, expiry, rotating refresh tokens with theft detection, session limit. **Missing: new-device alert**; logout-from-all-devices exists in the API but has no screen. **Defects D1, D2** |
| E1.5 | Device binding (Should) | ⬜ | | Needs the real client address and device to reach the API first (D1) |
| E1.6 | Onboarding screens | 🟡 | ☐ | Built: country, goal, PIN. **Missing:** the screens that explain how solo and èsúsú work, and the step into KYC (no KYC yet) |
| E1.7 | Install as app (PWA) | 🟡 | ☐ | Manifest and icons served and checked. Installing on Android and iOS, and the splash, are for your hand test |
| E1.8 | Authenticator-app second factor | 🟡 | ☐ | API complete (enrol, confirm, recovery codes, disable, encrypted secret). Sign-in code screen works. **Missing:** the screen to turn it on (comes with Me), and "enrolment required before the first money action" |
| E1.9 | Confirm email again | ✅ | ☐ | Resend after a minute, ten a day, `email_verified` boolean kept in step by the database |
| E1.10 | Housekeeping of sessions and tokens | ✅ | | Job built and tested. Runs only where the worker is deployed |

### E2. KYC

| ID | Feature | Mark | Note |
| --- | --- | --- | --- |
| E2.1–E2.8 | ID, selfie, address, location, bank, national check, status and retry, KYC gate | ⬜ | Waits on KYC partner sandbox keys (P0.3). Can be built behind a provider interface with a stand-in, as mail is. Note for E2.1: the profile route lets a person change country at any time (defect D4) |

### E3. Wallet and payments

| ID | Feature | Mark | Hand test | Note |
| --- | --- | --- | --- | --- |
| E3.1 | Ledger core | ✅ | | Double entry, database-level safeguards, idempotency, tests including real Postgres |
| E3.2 | Wallet view | ✅ | ☐ | API and screens (`/wallet`, summary on Today): balances per currency, paged history. **Built and tested on this branch; not yet merged or deployed** |
| E3.3 | Fund wallet | ⬜ | | Needs payment partner sandbox |
| E3.4 | Auto-debit mandate | ⬜ | | Needs payment partner sandbox |
| E3.5 | Withdraw to bank | ⬜ | | Needs E2.5 |
| E3.6 | Webhook inbox | ⬜ | | The ledger cannot join an outer database transaction today; settle that design here |
| E3.7 | Daily reconciliation | ⬜ | | Needs E9.1 |
| E3.8 | Limits by KYC tier | ⬜ | | Needs E2.7 |

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
| D1 | The web server sends no client address, so the API's per-address limits (10 sign-ins per 15 minutes, 5 sign-ups an hour, 120 requests a minute) are shared by every user; sessions also record the web server's address, not the person's | E1.1, E1.4, E1.5 | ❌ |
| D2 | Two requests at once on an expired access token each try to swap the single-use refresh token; the second looks like theft and ends the session. The wallet screens avoid it by asking one call at a time | E1.4 | ❌ (latent) |
| D3 | Password-reset emails have only the shared address limit, so one inbox can be flooded; verification emails already have a per-address limit | E1.1 | ❌ |
| D4 | `PUT /me/profile` lets a person change country at any time | E1.6, E2 | ❌ (until KYC) |

**Plan change proposed Oct 3, awaiting your approval before anything is built:** the four defects are written into the plan as acceptance criteria: D1 and D2 in E1.4, D3 in E1.1, D4 in E1.6. D1 is the prerequisite for the new-device alert and for E1.5.

## Your to-dos

**Hand tests** (on the Vercel build, on a phone, after each pull request merges; tick the boxes above)

1. E1.1 and E1.9: sign up, receive the email, open the link; try "Resend email" before and after the minute.
2. E1.4: sign in with a wrong then the right password; sign out; sign in again.
3. E1.6 and E1.3: finish onboarding with a PIN; try an easy PIN (it must be refused).
4. E1.7: add to home screen on Android and on iPhone.
5. E3.2: Today shows a wallet card; it opens `/wallet` (empty for a new account; real rows need the ledger seeded).

**Merge order for E1.1 (bot protection). Order matters, because the API rejects unknown fields until it has this change and production refuses to start without the bot-check settings**

1. Render, service `ajo-api`, Environment: add `BOT_CHECK` = `turnstile` and `TURNSTILE_SECRET_KEY` = the widget's **secret** key (not the site key). Do this first.
2. Vercel, project `ajo-web`, Environment Variables (Production and Preview): add `TURNSTILE_SITE_KEY` = `0x4AAAAAAFM0tH6uB0tllz7t`. The old web code ignores it.
3. Merge the API pull request (`phase-1/identity-and-wallet` in `ajo-api`). Render deploys it. From now until step 4, sign-ups on the live site are refused ("please complete the check"): keep the gap short.
4. Merge the web pull request. Vercel deploys it, and the sign-up form shows the check.
5. Hand-test E1.1 on your phone, then tick it.

**Bot protection on the live site: two things only you can do (found Oct 3)**

- **Cloudflare, Turnstile, your widget, Hostname management:** add `ajo-web-dusky.vercel.app` (and `ajo-web-abdulrasaq-taofeeqs-projects.vercel.app`; add `localhost` for local work). Until you do, Cloudflare refuses the page (console error 110200) and sign-up cannot complete. Preview URLs change per build and are not covered: test on the production address.
- **Vercel:** a variable you add reaches only *new* deployments, so redeploy after adding or changing one.

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

By the book, Phase 1 is open, and its gaps are in this order:

1. ~~Intro screen with real human photos (P0.4)~~ done; ~~E1.1 bot protection~~ built, waiting for your hand test and the merge order above.
2. **E1.2** username, then **E1.4** client address and device through to the API (D1), the refresh-token grace window (D2), the new-device alert and a logout-everywhere screen, then **E1.8** the screen to turn the authenticator on and the rule that it is needed before money moves, and **E1.6** the how-it-works screens (and D4). D3 (per-address limit on reset emails) closes E1.1.
3. **E2 KYC** (E2.1 to E2.8), then **E3.3 to E3.8**. That closes the Phase 1 gate: a verified user funds and withdraws, and the ledger matches the partner.
