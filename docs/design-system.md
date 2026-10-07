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

Every text pair is checked at 4.5:1 or better and every line or focus ring at 3:1. **Light and dark follow the device** until the person picks one on Me → Appearance (System, Light, Dark). The choice is stored on that device (`ajo-theme`) and set as `data-theme` on `<html>` by a small script in `<head>` before the first paint, so the page never flashes the other theme; with no choice, `prefers-color-scheme` decides. The browser's controls and theme colour follow too. Money heroes (the wallet balance and savings totals) use one dark green gradient (`hero-from` to `hero-to`, white text) in both themes. Buttons that start work show a small turning ring on the pressed button (`loading`), and cannot be pressed again until it ends.

## Type, shape and layout

- **Fonts:** Bricolage Grotesque (display), Be Vietnam Pro (text), JetBrains Mono (numbers), all self-hosted through `@fontsource` because the content security policy allows only `font-src 'self'`.
- **Radius:** 6 / 12 / 20 / 28px. In markup use `rounded-s`/`rounded-m` for 6/12, `rounded-[var(--radius-l)]` for 20 (cards, lists) and `rounded-[var(--radius-xl)]` for 28 (hero cards, sheets): plain `rounded-l` means "left side" in Tailwind, not our token. Fields and buttons are 12px; keypads and sheets 20px.
- **Touch targets:** 44px minimum; main buttons 56px; keypad keys 56px. The number pad always spans the full content width, so its edges line up with the main button under it.
- **Phone first:** every screen is built for a small Android phone. The main action sits at the bottom, where the thumb is, with the "switch screen" line under it.

## Components

| Component | Notes |
| --- | --- |
| `Button` | `primary`, `money` (gold, for moving money), `quiet`, `danger`; 44 or 56px; `block` for full width. `loading={busy}` on every button whose press waits on the server: no second press, and the pressed button alone shows the `Spinner` and `aria-busy` (screens that share one busy flag pass it to all their buttons) |
| `TextField` | Soft filled field that takes an outline when focused; hint below, error replaces the hint; password fields get a show/hide eye |
| `ChoiceChips` | Accessible radio group with arrow-key support |
| `ScreenHeader` | Inner screens: a slim app bar, back on the left and the title centred. **Tab screens** (Today, Save, Circles, Wallet, Me) pass `tab` and get the `TopBar` (Opay style): your picture (opens Me), the title as the page heading, Support and the bell with its unread count, pinned while the page scrolls. Without `tab` (sign-in, set-up) the title stands large on the page. A preview passes `backHref`, so it stays an inner screen |
| `TopBar`, `PersonPhoto` | The bar above, and a person's picture in a circle (private, served by our own `/api/photo/<username>?v=<version>`), falling back to the head-and-shoulders bead or initials. Use `PersonPhoto` wherever a person is drawn; never an `<img>` by hand |
| `AuthScreen` | The frame every sign-in screen shares: full height, content on top, footer line at the bottom, a corner of beads |
| `OptionCards` | Big tappable single-choice cards for onboarding questions: a title, one calm line, a tick when chosen |
| `HowItWorks` | Three swipeable scenes shown to a brand-new person before any question: a savings goal filling stitch by stitch with a coin landing each week (solo), the circle of photos with the gold ring travelling from person to person (èsúsú), a shield and three reasons rising in (trust). Pictures are for the eye (hidden from screen readers) and every message is also in words; they hold still when the device asks for less motion; skippable; the buttons stay pinned to the bottom on a short phone |
| `HandlePicker` | Choosing a handle as taking a seat: the person's own bead joins a circle of seven photos and the handle appears at its heart, shrinking as it grows; free or taken in words under the field, with name-based ideas to tap |
| `Avatar`, member card (`/me`) | A person's bead: the head-and-shoulders in a brand-green ring, used on Today to reach Me and on the member card. The member card is the account's face: bead, `@handle` large, name and email with a Confirmed tick, stitched round with a dashed thread like the other things the app sews together. Long emails truncate instead of widening the page; signing out of every device asks first, in a tinted panel that scrolls into view |
| `Keypad`, `PinPad`, `CodeBoxes` | Number pad; PIN pad (digits shown as dots); one-time code boxes (digits shown) |
| `CircleRing` | The group as beads in spot order; member photos when available, initials otherwise; status by ring style as well as colour |
| `Amount`, `StatusPill`, `Stitches`, `Receipt` | Money from integer minor units; paid / pending / late / covered / your turn; progress as stitches; the payment receipt |
| `TabBar`, `AppNav` | Five equal tabs, Opay style: Home, Save, Circles, Wallet, Me. There is no raised button or sheet; the things it used to hold are tiles on Today. `AppNav` (in the root layout) shows it only on the top screen of a section (`HOMES` in `AppNav.tsx`); flows keep the whole screen |
| `WalletSummary`, `BalanceCard`, `BalanceEye` | The money hero: `hero-card` gradient, `Amount` with `size="l" tone="hero"`, the eye that hides every balance (`useHiddenBalance`, remembered on the device) |
| `Initials` | A person's initials in a soft disc, the same tint every time for the same name |
| `AppearancePicker` | System / Light / Dark on Me (`useTheme`) |
| `Logo` | The Àjọ logo: green wordmark whose o is a piggy bank, with a gold ₦ coin and sparkles. Three transparent layers (`public/brand/ajo-wordmark.webp`, `ajo-coin.webp`, `ajo-rays.webp`) cut from the supplied artwork, so the coin and sparkles can move on their own. `ajo-logo.webp` is the whole logo for places that cannot animate. The app icons are made from `ajo-logo.webp` by `apps/web/scripts/generate-icons.py`: the whole logo for the home screen (plain, and a smaller maskable one that stays inside the circle Android crops to, and the iPhone one) and the pig-and-coin mark alone for the browser tab; `src/app/icons.test.ts` fails if the logo is cropped |
| `Welcome`, `RecoveryBadge` | The first screen, with its entrance (below); the lock badge on password recovery |

## Screen patterns (E1.11): follow these for every new screen

The look introduced with the app-shell refresh. New screens and restyles should use these pieces
rather than inventing new ones, so the app keeps one feel.

- **Lead with what matters most.** The first thing on a screen is the person's money or the thing
  they came to do (a balance, a total, the next turn), as a hero card. Actions that need them
  (passport, second lock, requests waiting) come right after, as tinted banners with an icon disc.
  Everything else follows.
- **Hero card** for any headline money figure: `className="hero-card rounded-[var(--radius-xl)] p-5 shadow-lift"`,
  amounts as `<Amount size="l" tone="hero" />`, labels `text-on-hero-muted`, inner chips
  `bg-[var(--hero-chip)]`, and its main action as a gold (`bg-oro text-on-oro`) button inside the card.
  Respect the hidden-balance eye (`useHiddenBalance` / `HiddenAmount`) wherever a balance shows.
- **Quick actions** as tiles: a 48px rounded-2xl icon square in a tint (`bg-*-tint text-*`) above a
  12px label, four to a row (two rows of four on Today), inside one raised card.
- **Lists** as one grouped card: `divide-y divide-line overflow-hidden rounded-[var(--radius-l)] bg-surface-raised shadow-lift`,
  each row `flex items-center gap-3 p-4 hover:bg-surface-sunken` with a 40px icon disc or `Initials`
  on the left and a chevron on the right. Not a stack of separate shadowed cards.
- **Section headings** `font-display text-[18px] leading-6 font-semibold`; small group labels
  (e.g. TODAY / EARLIER) `text-[13px] font-semibold tracking-[0.04em] uppercase text-ink-muted`.
- **Colour by meaning:** gold for money moving, leaf for good news, danger for a problem,
  tertiary (indigo) for circles and reminders, primary for everything else. Never colour alone: a
  word or an icon says the same.
- **Tokens only.** No `bg-white`, `text-black` or hex in components (the QR code is the one
  exception: scanners need black on white). Both themes come from the tokens; a scrim over the page
  is `bg-black/50`, the same in both. Check every new screen in light and dark.
- **Loading** looks like the thing that is coming: a pulsing block the size of the card
  (`animate-pulse bg-surface-sunken`, or `bg-[var(--hero-chip)]` on a hero), with `role="status"` and
  a hidden "Loading…".
- **`cn` does not merge Tailwind classes.** To change an `Amount`'s size or colour use its `size` and
  `tone` props, not `className`.
- **Bottom space:** screens with the tab bar keep `pb-28` so the last row clears it.

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
| Onboarding (how it works, country, goal, handle, transaction PIN) | Built (`/onboarding`); Today sends anyone who hasn't finished it there. It asks only for what is still missing, so someone who stopped part-way, or set up before handles existed, is asked for just the rest; the scenes are for a brand-new person. Each answer is saved as it is given |
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
