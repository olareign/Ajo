# Àjọ — Progress Checklist

Oct 4, 2026 · @olareign

The live status of every bullet in the [project plan](project-plan.md), by phase. The plan says what must be true; this page says what is. It is audited against the code, the tests and the live deployment, not against memory. Update it in the same pull request as the work.

| Mark | Meaning |
| --- | --- |
| ✅ | Done and working: built, automated tests pass, checked against the real API |
| 🟡 | Partly done: the note says what works and what is missing |
| ❌ | Failing, or built but defective: the note names the defect |
| ⬜ | Not started |
| ⏸ | Pended by the owner: deliberately not built yet, with the reason. The screens may exist; nothing pretends to work |
| ☐ / ☑ | **Your hand test** on the Vercel build, on a phone. Tick it when you have proved it yourself; a feature is only finished when its box is ticked and its pull request is merged |

## Where things stand (Oct 4, 2026)

| Check | Result |
| --- | --- |
| Web production (Vercel `ajo-web`) | Ready, serving `main` at `f00625a` (PR #13). Every merge into `main` deploys |
| Web automated tests | 749 unit and component tests pass; lint, typecheck and format clean |
| API automated tests (`ajo-api`) | 297 unit and 399 integration tests pass against real Postgres and Redis, including payments under concurrency: the same webhook delivered many times at once, contradicting webhooks, a double-tapped withdrawal, two withdrawals against one balance, a withdrawal racing a payment, and auto-debit set up, activated and cancelled at once. The books balance after every one |
| Full-stack browser tests | **Payments (Oct 4): add money, the partner's message, withdraw with PIN and authenticator code, and the arrival pass against the real API and Postgres with the stand-in partner (`E2E_PAYMENTS=1`, API started with `PAYMENTS_FAKE=true`).** Default mode: 6 pass, 1 skipped. With the bot check on (real Cloudflare test keys): 7 of 7. Needs a dev server with a fixed `SESSION_SECRET`. The E1.8 and E1.5 journey (turn on, remembered phone, new device asked, spare key, untick, turn off) passes against the real API and Postgres, and so do the other eight with per-person limits on (Oct 4) |
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
| E1.8 | Authenticator-app second factor | ✅ | ☐ | Built Oct 3: the **Second lock** screens (Me, then Authenticator app): a QR code drawn in the browser plus the same key as text, a code to prove it works, then the ten one-use recovery codes on a ticket, shown once, with Copy and Download, and you cannot finish until you tick that you saved them. Turning it off needs your password and a fresh code, and a typo does not sign you out. Today nudges until it is on. At sign-in the code is asked only on a new device (E1.5). On the API, **any route marked `@MoneyAction()` refuses until the app is on (403 `mfa_enrolment_required`) and needs a fresh code in the `X-Ajo-Mfa-Code` header (a code works once; ten wrong ones lock for 15 minutes)**. The real money routes now carry it (withdraw and the payout account, through `@MoneyRoute()`, which puts the identity gate first and this one second); adding money and auto-debit need the app on but no code |
| E1.9 | Confirm email again | ✅ | ☐ | Resend after a minute, ten a day, `email_verified` boolean kept in step by the database |
| E1.10 | Housekeeping of sessions and tokens | ✅ | | Job built and tested. Runs only where the worker is deployed |

### E2. KYC

| ID | Feature | Mark | Note |
| --- | --- | --- | --- |
| E2.1 | ID verification | ⏸ | ⏸ Pended by owner (Oct 4): the real check waits until the tools are chosen. The screen is built and country-aware (Nigeria: NIN, passport, driver's licence, voter's card; UK: passport, driving licence, residence permit) and **walkable in the Preview**. The real check waits for the identity partner: Smile ID for Nigeria; the UK vendor is undecided |
| E2.2 | Selfie and liveness | ⏸ | ⏸ Pended by owner (Oct 4): the real check waits until the tools are chosen. Built as a viewfinder with three movements (look straight, turn, smile); the preview never opens the camera. The capture itself will be the partner's camera component |
| E2.3 | Proof of address | ⏸ | ⏸ Pended by owner (Oct 4): the real check waits until the tools are chosen. Built: choose the document, pick a file (a preview never reads or sends it). Needs a place to keep documents (see the accounts list) |
| E2.4 | Location capture | ⏸ | ⏸ Pended by owner (Oct 4): the real check waits until the tools are chosen. Built with a plain explanation of what is kept; the preview shows a sample area and never asks the browser. Needs a geocoding account for the area name |
| E2.5 | Bank account | ⏸ | ⏸ Pended by owner (Oct 4): the real check waits until the tools are chosen. Built: bank and account number (UK: sort code), the bank's name for the account is shown and **must match the ID name** (rule built and tested). The lookup waits for Paystack (Nigeria) or Modulr (UK) |
| E2.6 | National checks (optional) | ⏸ | ⏸ Pended by owner (Oct 4): the real check waits until the tools are chosen. BVN screen built for Nigeria only; raises the tier. Waits for Smile ID |
| E2.7 | KYC status and retry | 🟡 | Built: a **member passport** with a stamp per step. The API works status and tier out from per-step records (`kyc_steps`); the screen shows not started, in progress, waiting, approved, or refused with the reason and a **Try again** that returns to that stamp. Fills with real results once a partner is connected |
| E2.8 | KYC gate | ✅ | API: any route marked `@RequiresKyc()` refuses with 403 `kyc_required` until every required step is approved. **It now guards the real money routes** (add money, auto-debit, withdraw and the payout account, through `@MoneyRoute()`), proved in the payments tests. Because the real checks are pended, no ordinary person can pass it yet, so no one but an account you approve by hand (see "Testing payments while KYC is pended") can move money. Web: `KycGate` closes a screen the same way |

**How the unconnected screens behave (decided Oct 4).** Nothing is connected yet, so the API reports `connected: false` and every step shows a locked "Not switched on yet" with a **Preview the flow** link. The preview (`?preview=1`) is a walk-through with sample data kept in that browser tab only: it never calls the API, the camera, location or the file system, and the database stays empty (a full-stack test proves it). In production a stand-in partner can never approve a real person, because production refuses stand-ins by design. The money screens (add money, withdraw, auto-debit) now make real calls once a partner is connected and the person is approved, and never show a success the API has not given; outside a preview nothing pretends. The identity steps stay locked, because their real checks are pended. Preview-only samples for reviewers: an ID or BVN ending 0000, an account number ending 0000 (someone else's name) or a file called "blurry" shows a refusal; a withdrawal ending 666 shows a bank refusal being reversed. Defect D4 (country can change any time) still stands until the real KYC steps start.

### E3. Wallet and payments

| ID | Feature | Mark | Hand test | Note |
| --- | --- | --- | --- | --- |
| E3.1 | Ledger core | ✅ | | Double entry, database-level safeguards, idempotency, tests including real Postgres |
| E3.2 | Wallet view | ✅ | ☐ | Balances per currency and paged history, now with Add money, Withdraw, Auto-debit and Your limits within reach |
| E3.3 | Fund wallet | 🟡 | ☐ | **Built Oct 4, live as soon as a partner's key is set.** `POST /payments/fund` takes the amount and method (card, bank transfer or USSD in Nigeria through Paystack; the UK has no payment partner, so its screens stay locked), returns the partner's page to pay on, and the person comes back to `/wallet/add/return`, which only **watches** and says "Money added" once the API says so (never on the strength of the address they arrived by). Money is credited only by the partner's signed message or a status check, once, however many times it is delivered. The same key for the same payment means a double tap or a retry cannot charge twice. The Paystack adapter follows Paystack's published format and is tested with scripted answers; **it has not yet met a real sandbox**, which is the first thing to do once you add the keys. Whether the UK needs card funding is still an open question |
| E3.4 | Auto-debit mandate | 🟡 | ☐ | **Built Oct 4.** One open mandate per person (the database refuses a second); set up on the partner's page, followed until the bank confirms, cancelled with the partner first so it never looks cancelled here while the partner can still collect. Cancelling stays blocked while a plan or circle needs it (that count is zero until Phase 2). A late message never brings a cancelled mandate back. Same status as E3.3: the adapter is unproven against a live sandbox. Nigeria only |
| E3.5 | Withdraw to bank | 🟡 | ☐ | **Built Oct 4, Nigeria only** (the UK needs a partner, which is not chosen). The route needs approved identity, the authenticator app on, a fresh authenticator code and the PIN. The bank must name the account as the person's own before it can be used, and only the partner's recipient code is stored, never the account number. The money is **held first, then sent once, and returned once if the bank refuses**; two withdrawals cannot spend one balance, and a withdrawal racing a payment cannot overdraw (tested). The screen follows it: Received, Sent to your bank, Arrived or Sent back. **Turn off Paystack's OTP for transfers** in its dashboard, or transfers stay unfinalised |
| E3.6 | Webhook inbox | ✅ | | Built Oct 4. Every partner message is checked against its signature over the exact bytes, stored once, acted on once, and retried if it cannot be acted on yet (for example a bank's "active" that arrives before the message that says which mandate it is). The ledger now joins an outer database transaction, so a balance change and its inbox record commit together. A sweep **inside the API** retries held messages and settles payments that sat pending, every minute, with a lock so copies of the API do not collide; no worker is needed (`PAYMENT_SWEEP_SECONDS`, 0 turns it off) |
| E3.7 | Daily reconciliation | ⬜ | | Needs E9.1 |
| E3.8 | Limits by KYC tier | ⏸ | ☐ | **Pended by owner (Oct 4): enforcement waits until the identity tools and the real limits are decided.** The ladder screen is built (`/wallet/limits`): not verified, passport stamped, BVN added (Nigeria only), with your rung marked. **The numbers shown in the preview are samples; the real limits are a business decision (P0.1, E11.10) and nothing enforces limits yet** |

### E4. Solo savings (Phase 2, built Oct 4)

| ID | Feature | Mark | Hand test | Note |
| --- | --- | --- | --- | --- |
| E4.1 | Create plan | 🟡 | ☐ | A five-step wizard (what for, how much, how often and how many times, first day, look it over) with the pot that will hold it growing as you answer. The server works out the debit days (`POST /savings/preview`) and the review shows them as beads before anything is saved. One plan per request key, at most ten going at once, even when made all at once (tested). Needs approved identity, not a payment partner |
| E4.2 | Scheduled debits | 🟡 | ☐ | Each debit is taken from the **wallet** at 8am (Lagos or London time) on its day. If the wallet is short it tries again each day for three misses, tells the person (in-app and email), then skips that debit and carries on. If the person chose "top up from my bank", it collects only the shortfall under their auto-debit and waits for the bank without counting that as a miss. Reminders go out a day ahead, by email too when the wallet will not cover it. Each debit happens once, however many sweeps race for it (tested). **Runs on the shared scheduler inside the API, so it only fires while the API is awake; on the free plan that means it can be late. It is on time on the always-on server you plan to move to** |
| E4.3 | Plan progress | 🟡 | ☐ | The pot fills with what the ledger says is saved; progress, next debit with whether the wallet covers it, the debits as a string of beads (paid, coming, missed, skipped), and the plan's own history |
| E4.4 | Maturity payout | 🟡 | ☐ | After the last debit is settled everything saved goes back to the **wallet** (from there you can withdraw to your bank) and the plan completes, once, with an email |
| E4.5 | Early withdrawal | 🟡 | ☐ | Ends the plan now with the PIN, brings back what is saved, skips the rest. **The charge for ending early is a setting, `EARLY_WITHDRAWAL_PENALTY_BPS`, set to 0 (free) until you decide**; the screen shows the real figure before you confirm. Ending twice, or all at once, pays out once (tested) |
| E4.6 | Pause or top up | 🟡 | ☐ | Pause stops the debits; starting again moves any debit whose day went by to today and keeps the rest in step. A top-up moves money from the wallet into the pot now, once per key |
| E8.1 | Notification service | ✅ | | One service saves a message once per key, in the app and optionally by email from a queue that survives a mail outage and gives up after five tries. Push and SMS are not built |
| E8.2 | Reminders | 🟡 | | Before each debit, when one is missed, when the wallet is short, at maturity or early end. Before payout is part of Phase 4 |
| E8.3 | Notification centre | ✅ | ☐ | A Messages screen from the bell on Today (with an unread count), paged, mark one or all as read |

Nothing is real until a person is approved. For your own test account see "Testing payments while KYC is pended"; the savings screens are also walkable with `?preview=1` (a pretend plan in the tab, with a "take the next debit" button to watch the pot fill).

### E5. Friends and discovery (Phase 3, built Oct 4)

| ID | Feature | Mark | Hand test | Note |
| --- | --- | --- | --- | --- |
| E5.1 | Find people | 🟡 | ☐ | Search by the **start of a username** (three letters, a pause, then the results), and by **invite link** (E5.9). Only verified, active people appear, never yourself, never anyone blocked either way, and only ten at a time, so it cannot list everyone. A person's card shows a first name, handle, badge and friends in common, never an email. **Searching by phone is pended** (see E5.6). The searcher must be verified too |
| E5.2 | Friend requests | 🟡 | ☐ | Send, accept, say not now (quietly), take back; the person asked is told in the app, and so is the asker when accepted. Asking twice is one request; **two people asking each other at the same moment become friends, with one row**; asking someone who already asked you accepts. Up to 50 requests waiting and 500 friends, even when made all at once (tested) |
| E5.3 | Friend list | 🟡 | ☐ | "Your circle" drawn as a ring with the count, the list with badges (**Verified**, or **Verified +** with a national check) and "friends since", and removing a friend (they are not told). Trust badges from the trust score arrive with E7 |
| E5.4 | Block and report | 🟡 | ☐ | Blocking ends any friendship or request, hides each of you from the other everywhere, and the blocked person is never told; "no such person" is the same answer for someone missing, unverified or blocked, so it cannot be used to learn who blocked whom. A block that lands while a request is in flight wins (tested). Reports pick a reason and go to the admin queue (one open per person); there is no admin screen to read them until E9 |
| E5.5 | Mutual friend suggestions | 🟡 | ☐ | "People you may know": friends of friends, most in common first, naming two, never anyone you already have a request with, blocked or unverified; plus whoever invited you and whoever you invited |
| E5.6 | Contact matching | ⏸ | | **Pended by design.** Matching contacts needs a **verified phone number**, and there is no SMS partner to verify one. Without verification someone could claim another person's number and intercept their requests, so the app does not collect phone numbers at all yet. The Find screen says so. Resumes when you choose an SMS provider (Termii or Twilio) |
| E5.7 | Nearby people | ⏸ | | **Pended** with the location step of KYC (E2.4): it needs a verified location to measure from. Says so on the Find screen; will only ever show an area name |
| E5.8 | Group discovery | ⬜ | | Built with groups in Phase 4 (it needs E6.1) |
| E5.9 | Invite to app | 🟡 | ☐ | Your own invite link and code, to send by **WhatsApp, text message, copy or the phone's share sheet**. The page it opens (`/join/<code>`) shows only the inviter's first name and handle, then leads to sign-up with the code carried through. Joining through it **suggests** each to the other; it never makes anyone a friend. A wrong code is ignored without a word at sign-up |

Nothing here works until a person is approved. For your own test accounts see "Testing payments while KYC is pended"; the friends screens are also walkable with `?preview=1` (a pretend circle in the tab).

## Phases 2 to 6

| Phase | Epics | Mark |
| --- | --- | --- |
| 2 Solo savings | E4 (with E8.1 to E8.3) | 🟡 Built Oct 4, waiting for your hand test |
| 3 Friends and discovery | E5 | 🟡 Built Oct 4 (phone search, contacts and nearby pended), waiting for your hand test |
| 4 Èsúsú groups | E6, E7 | ⬜ |
| 5 Launch readiness | E10 | ⬜ |
| 6 Mobile and new countries | React Native | ⬜ |
| Alongside | E8 notifications: **service, reminders and the in-app messages screen built (Oct 4)**; push and SMS are ⬜ until you create those accounts. E9 admin: ⬜. E11 multi-currency: ledger and wallet screens hold several currencies (🟡); the rest ⬜ | |

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
8. E3.3 to E3.5 (after Paystack's test key is in Render and you have approved your own test account, see below): add money with a Paystack test card, come back and watch it turn to "Money added"; set up a payout account and withdraw; double-tap Send it and check only one withdrawal appears; set up and cancel auto-debit. In Paystack's dashboard check each webhook delivery shows 200.
9. E1.4: sign in on your phone, then in a different browser or on another device: the owner gets a "New sign-in to your Àjọ account" email naming it. Open Today, tap the round person icon (Me), and use "Sign out of all devices": every other device must lose access.

**Merge order for E3.3 to E3.6 payments and the new emails (this release). The API now reads payments tables and the emails load the logo from the web app, so: database, then web, then API, then keys.**

1. **Neon SQL editor:** run `ajo-api/scripts/sql/bring-database-up-to-date.sql` (adds `payment_intents`, `webhook_events`, `payout_accounts`, `mandates`, plus `trusted_devices` and `kyc_steps` if not yet run; verified identical to the migrations, safe to repeat).
2. Merge the **web** pull request first: it carries `/email/logo.png`, which the redesigned emails load, and its payment screens stay locked until the API reports a partner as connected, so it is safe ahead of the API.
3. Merge the API pull request; Render deploys it (nothing is connected yet, so nothing changes for anyone). If no deploy starts, Manual Deploy.
4. When you are ready to try a partner: in the Render dashboard add `PAYSTACK_SECRET_KEY` (the **secret** test key, `sk_test_...`), then in Paystack set the webhook URL to `https://ajo-api-78oq.onrender.com/api/v1/webhooks/paystack` and turn off OTP for transfers. Confirm Render's `WEB_APP_URL` is the public web address: partners send people back there. Keys go only in the dashboards, never in chat.
5. Production refuses to start with a Paystack key of the wrong shape (a public key, say) and always refuses the stand-in `PAYMENTS_FAKE`.

**Testing payments while KYC is pended.** The real identity checks are not built, so nobody can pass the money gate. For **your own test accounts only**, on a sandbox or test key, approve the passport by hand in the Neon SQL editor (replace the email):

```sql
INSERT INTO kyc_steps (user_id, step, status)
SELECT id, s, 'approved' FROM users, unnest(ARRAY['id','selfie','address','location','bank']) s
WHERE email = 'you@example.com'
ON CONFLICT DO NOTHING;
```

Never do this for anyone else, and not on live keys: it skips the very checks the gate exists for.

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
| UK collections (E3.3, E3.4) | ~~GoCardless~~ | **Dropped Oct 4**: registration was too heavy. Built, then removed; nothing replaces it yet | Pick another UK partner when the UK is next |
| UK holding, payouts, name check (E2.5, E3.5) | **Modulr** | **Recommended**, paid, contract needed (confirm sandbox access) | The plan's fund holder; Confirmation of Payee for the name check |
| UK card funding | Stripe or similar | **Open question**, paid usage | The plan names no UK card provider |
| Background worker for webhooks (E3.6) | Not needed | Done inside the API | The sweep runs in the API itself, so no paid worker is needed for payments. E1.10 housekeeping still wants one |
| Not needed yet | ComplyAdvantage (E11.9), Wise Platform (cross-border), Termii and Twilio (E8) | Defer | |

Create them in this order: Paystack test mode, then (when KYC resumes) Smile ID sandbox, Sumsub trial, R2 bucket, LocationIQ, Modulr.

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

By the book, Phase 1 is open. What remains:

1. Done and waiting for your hand test: P0.4 photos, E1.1 bot protection, reset limits and the new emails, E1.2 usernames, E1.4 sessions and alerts, E1.5 new-device code, E1.6 scenes and flow, E1.7 icons and install prompt, E1.8 second lock, the E2 and E3 screens in Preview, and **E3.3 to E3.6 payments**.
2. **You:** follow the payments merge order above, add Paystack's test key, and tell me what the sandbox does. The adapter is written from Paystack's documents and is the least proven part, so expect small fixes on first contact. Nothing is planned for the UK payments until you choose a partner.
3. **Pended by your decision (Oct 4):** the real KYC checks, E2.1 to E2.6, until the tools are chosen, and E3.8 limit enforcement. Their screens and previews stay. Needed to resume: the identity vendors (Smile ID for Nigeria; the UK vendor is open), the real limits per tier and country (P0.1), and the Nigerian fund holder after legal advice (P0.2).
4. **Still open:** which partner serves the UK (collections, auto-debit and payouts; GoCardless is dropped), and whether the UK needs card funding.
5. Then **E3.7** reconciliation (needs the admin console, E9.1), and D4 (freeze the country once KYC starts).
