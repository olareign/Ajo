# Àjọ — Design System

Oct 1, 2026 · @olareign

White and green lead; the original indigo is kept as a quiet tertiary accent; gold is reserved for money. The circle (the group's members drawn as beads) is the motif. Tokens live in `apps/web/src/app/globals.css` (Tailwind `@theme`); components live in `apps/web/src/components`. The layout patterns for the auth screens come from the UI reference supplied by the product owner, re-coloured and re-composed for Àjọ rather than copied.

## Colour

| Role | Token | Light | Dark | Used for |
| --- | --- | --- | --- | --- |
| Primary | `primary` / `primary-deep` / `primary-tint` | `#057A3F` / `#035E30` / `#E3F5EB` | `#4CCB84` / `#7FE0A8` / `#12301F` | Buttons, links, headings, selected chips and tabs, the app icon |
| Tertiary | `tertiary` / `tertiary-tint` | `#222F78` / `#E8EAF8` | `#9AA7F5` / `#1C2250` | Small labels above headings, bead decorations, one-time code digits, the piggy-bank badge, a member who is "covered" |
| Money | `oro` / `oro-tint` | `#D99A1E` / `#FBEFD2` | `#F2BB4C` / `#3A2C0E` | Only where money moves: the round's recipient, the Add money action |
| Surface | `surface` / `surface-raised` / `surface-sunken` | `#FFFFFF` / `#FFFFFF` / `#F3F5F7` | `#0A1410` / `#101C16` / `#070F0B` | Page, cards, and filled fields and keypads |
| Text | `ink` / `ink-muted` | `#0F1F17` / `#4A5750` | `#EDF6F0` / `#A3B5AA` | Body and secondary text |
| Lines | `line` / `line-strong` | `#E2E6EA` / `#7C8794` | `#22342A` / `#6F8B7B` | Dividers; outlines of controls (3:1 or more) |
| Status | `leaf`, `danger` | `#1D7346`, `#B3361D` | `#62CF92`, `#FF8F73` | Paid; errors |
| Focus | `focus` | `#2F4AD6` | `#F2BB4C` | One visible ring on every control |

Every text pair is checked at 4.5:1 or better and every line or focus ring at 3:1. **The app is always white**: it does not follow the device's dark mode (the page, the browser's own controls and the theme colour are all light). The dark values stay in the tokens for a future, deliberate dark theme, switched on with `data-theme="dark"`.

## Type, shape and layout

- **Fonts:** Bricolage Grotesque (display), Be Vietnam Pro (text), JetBrains Mono (numbers), all self-hosted through `@fontsource` because the content security policy allows only `font-src 'self'`.
- **Radius:** 6 / 12 / 20px. In markup use `rounded-s`/`rounded-m` for 6/12 and `rounded-[var(--radius-l)]` for 20: plain `rounded-l` means "left side" in Tailwind, not our token. Fields and buttons are 12px; keypads and sheets 20px.
- **Touch targets:** 44px minimum; main buttons 56px; keypad keys 56px. The number pad always spans the full content width, so its edges line up with the main button under it.
- **Phone first:** every screen is built for a small Android phone. The main action sits at the bottom, where the thumb is, with the "switch screen" line under it.

## Components

| Component | Notes |
| --- | --- |
| `Button` | `primary`, `money` (gold, for moving money), `quiet`, `danger`; 44 or 56px; `block` for full width |
| `TextField` | Soft filled field that takes an outline when focused; hint below, error replaces the hint; password fields get a show/hide eye |
| `ChoiceChips` | Accessible radio group with arrow-key support |
| `ScreenHeader` | Squared back button, optional small label, heading and one calm subtitle |
| `AuthScreen` | The frame every sign-in screen shares: full height, content on top, footer line at the bottom, a corner of beads |
| `OptionCards` | Big tappable single-choice cards for onboarding questions: a title, one calm line, a tick when chosen |
| `Keypad`, `PinPad`, `CodeBoxes` | Number pad; PIN pad (digits shown as dots); one-time code boxes (digits shown) |
| `CircleRing` | The group as beads in spot order; member photos when available, initials otherwise; status by ring style as well as colour |
| `Amount`, `StatusPill`, `Stitches`, `Receipt` | Money from integer minor units; paid / pending / late / covered / your turn; progress as stitches; the payment receipt |
| `TabBar` | Today, Circles, Wallet, Me, with the gold action in the centre |
| `Logo` | The Àjọ logo: green wordmark whose o is a piggy bank, with a gold ₦ coin and sparkles. Three transparent layers (`public/brand/ajo-wordmark.webp`, `ajo-coin.webp`, `ajo-rays.webp`) cut from the supplied artwork, so the coin and sparkles can move on their own. `ajo-logo.webp` is the whole logo for places that cannot animate |
| `Welcome`, `RecoveryBadge` | The first screen, with its entrance (below); the lock badge on password recovery |

## Motion

Only transform and opacity move. Everything is skipped when the device asks for reduced motion: nothing moves and the screen is simply there.

| When | What |
| --- | --- |
| 0.0s | The circle rolls in from the side like a wheel (slide plus a turn), its beads turning with it, and settles; the pot amount fades in once it stops |
| 0.5s | The logo fades up |
| 1.0s | The coin falls from the circle into the piggy bank behind its back; the logo gives one small bounce |
| 1.65s | The sparkles appear and twinkle twice |
| 1.1s, 1.25s | The tagline and then the buttons rise in |

## Screens and build status

| Flow | Status |
| --- | --- |
| Welcome | Built (`/`) |
| Sign up, confirm email, sign in, password recovery | Built (`/sign-up`, `/check-email`, `/verify-email`, `/sign-in`, `/forgot-password`, `/reset-password`). Check your email has a Resend button that waits a minute between sends; signing in before confirming lands there |
| Verify it's you (authenticator code or recovery code) | Built (`/sign-in/verify`); turning the second factor on from the app comes with the Me screen |
| Onboarding (country, goal, transaction PIN) | Built (`/onboarding`); Today sends anyone who hasn't finished it there |
| Wallet | Built (`/wallet`): a card per currency with what is available, locked and saved, and the activity list a page at a time; Today shows a summary that leads to it. Adding and withdrawing money come with funding |
| KYC | Phase 1, next |
| Solo savings, referrals, groups | Phases 2 to 4 |

## Where the build departs from the reference, and why

| Reference | Built | Reason |
| --- | --- | --- |
| Google and Apple sign-in buttons | Not shown | Social sign-in comes after launch; buttons that do nothing would mislead |
| "Resend code" on the code screen | "Use a recovery code" | The code comes from an authenticator app and cannot be resent |
| Green on white with a flat white top | Same palette, with a corner of beads and the indigo as a tertiary accent | Keeps the circle motif and the original brand colour |
| "Earn Interest", "Interest Rate 7.5 pa" | No interest anywhere | Product spec: no interest, rewards must be Sharia-compatible |
| "Alajo" | "Àjọ" | Name used in the repo docs; the app name is still an open question in the spec |
| Password recovery typo ("Passsword") | "Password recovery" | Corrected |
| Photo avatars | Initials, until photos are added to `public/people/` | Photos need licensed images; see `public/people/CREDITS.md` |
| Date "Jan 19" | Dates formatted for the user's locale | Spec E11.7 |
