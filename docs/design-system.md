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

## Desktop (E1.26, Oct 10)

- **Breakpoint `lg` (1024px).** Below it, every app screen is the phone layout, unchanged. At `lg` and up, pages inside the app (`isAppRoute` in `src/lib/app-routes.ts`) get the `DesktopNav` sidebar (248px) and the bottom `TabBar` hides. Sign-in and its neighbours become a split screen (form left, a showcase panel right). Set-up and invites keep the phone-sized column. The public pages (`isPublicPage`) lay themselves out at every width.
- **Inner screens on a desk** keep the back button and the header action (the circle board link exists only there); the title stands large on the left instead of centred in a bar.
- **Width.** Screens keep `px-4` at every size (the sticky bars rely on it) and widen with `lg:max-w-*`: Today, Wallet, Statements, Insights `lg:max-w-6xl`; Save, Circles, Friends, Messages, Me `lg:max-w-3xl`; the circle board `lg:max-w-7xl`. Forms stay phone-width.
- **The desktop shell (Oct 11, after the owner's banking-dashboard reference; Àjọ's colours).** Sidebar: the logo, groups "Menu" (Home, Wallet, Save, Circles, Friends, Notifications), "Your money" (Statements, Insights) and "Account" (Me), the active item tinted, and a Help Center card at the foot (`hero-card`, a "?" disc, "Go to Help Center" → `/me/help`). Header on every app screen (`DesktopHeader`, sticky): "Welcome to Àjọ." with "Àjọ." in primary and "Hello <first name>, welcome back!" on the left; help, notifications (gold unread count) and your picture on the right, as 44px rounded squares with a soft shadow. Tab screens' own top bars drop their picture and icons on a desk and become the page title (Today's is "Overview").
- **Panels.** Big rounded cards (`rounded-[var(--radius-xl)] bg-surface-raised p-6 shadow-lift`) with a 20px display title and a quiet link at the top right. Today: money card, quick actions, to-dos, savings and circles on the left; "This month" (what's in the wallet, money in ↑ and out ↓, the latest four payments, See all) and friends on the right. Wallet: balance, actions and activity grouped by day on the left; "This month" and Payment details (picked from the list: amount, what it was, part of your money, when, reference to copy, Statement) on the right, kept in view while scrolling.
- **Fill the width (Oct 11).** Every app page uses `PAGE` (`src/lib/page.ts`): one column on a phone; on a desk the whole width beside the sidebar with 32px side margins, matching the header. Pages lay their parts in columns rather than centring a narrow column: Home and Wallet three columns on `xl`, two on `lg`; Circles and Save card grids with a side panel; Friends, Me and Help two columns. Form pages use `FormPage`: the form up to 600px on the left, a short `AsideCard` note on the right (every sentence restates what the app already does; see `desk/asides.tsx`). Statements and Insights put their filters in one toolbar card.
- **Header controls.** Light/dark, help, notifications, your picture. The bell shows the unread count, is re-checked every minute while the page is visible and when you return to it, and rings (and announces "N new notifications") when the count goes up; reduced motion removes the swing only.
- **Sign out** is in the sidebar under Account. **Close account** is the quiet last line of Me's Security group, not a prominent link.
- **Desk-only parts fetch their own data, and only on a wide screen** (`useWide`), so a phone never asks for what it won't show. Phones keep the same parts in the same order.
- **Desktop-first features.** Statements (`/wallet/statements`, table on desktop, list on phones, CSV download), Insights (`/insights`, charts), the circle board (`/circles/<id>/board`, linked from a circle's top bar on desktop). They work on phones too, but are only linked from the sidebar or desktop-only buttons.
- **Charts.** Marks use `--chart-in` / `--chart-out` / `--chart-grid` only (validated for colour-blind separation and contrast in both themes); text never wears them; always a legend for two series, hover details, and a table view.
- **Keypads** take typed digits on desktop without being clicked first.
- **Landing page.** `/` shows `Landing` on wide screens and the `Welcome` screen on phones.
- **Logo in two themes.** The green wordmark has a lighter twin for dark mode (`ajo-wordmark-dark.webp`, `ajo-logo-dark.webp`, green `#4ED388`, made from the original artwork; the gold coin and sparkles are shared). `Logo` draws both and the `.theme-light-only` / `.theme-dark-only` classes show the one for the page's theme, including a theme picked on Me. Never put the light logo on a dark surface.


## Public pages and voice (Oct 11): the consistency rules

The pages anyone can read before signing in (`/` on a desk, How it works, Safety, About, Help)
and the sign-in split screen. **The owner's design is the reference** (`src/components/landing/`,
`src/components/help/PublicHelpCenter.tsx`, the three pages under `src/app`): its header and
footer, the soft background decorations, rounded bordered cards with an icon tile and a small
badge, the live dashboard mockup, and the hero-card call to action. New public pages reuse those
pieces rather than inventing new ones. Terms and Privacy keep the app's own narrow column.

**Say only what the app does.** This is the rule the design must never break.
- No promises the code can't keep: no "guaranteed", "100% payout", "zero default/risk", "24/7",
  response times, "bank-grade", "biometric", "cryptographic", status badges ("all systems
  operational"), made-up testimonials, company names, or "licensed/regulated partner" claims.
  `src/components/landing/Claims.test.ts` fails if one of those comes back.
- Deposits cover a missed share only for members who lock one; members with a good record have
  none, so a round they miss pays what came in. Say "deposits cover a missed share", never "every
  payout is guaranteed".
- Numbers match the API: circles of 3 to 30, weekly / every two weeks / monthly, two days of
  retries, a 90-day pause after a miss, a 6-digit PIN. UK money comes in by card; withdrawals to UK
  banks aren't switched on yet. Say what isn't there yet.
- Use they/them for anyone in an example; names don't tell you pronouns.

**Inclusive by default.**
- Anything that moves on its own (the dashboard demo) pauses for people whose device asks for
  reduced motion, has a visible play/pause control, and stops all its timers when the page goes.
- Every control has a name a screen reader can say; colour is never the only signal.

**Help.** Visitors use `/help` (the Help Center). Inside the app, every Help link goes to
`/me/help`, the app's own help screen, so the sidebar and tab bar stay. Both show the support
email staff set in the admin console (Settings), read on the server, `info@ajo.com` if the API
can't answer.

**Privacy notice.** `PrivacyNotice` shows once per device (bump `NOTICE_VERSION` when its words
change). It is a notice, not a consent choice, because everything Àjọ stores is needed for it to
work; if anything optional is ever added (analytics), it needs a real choice first. It never covers
a phone's bottom buttons: top of the screen outside the app, above the tab bar inside it.

## Calm screens (Oct 17)

- **Sign-in and its neighbours:** on a phone, the form with the button by the thumb. From a tablet up, the form alone in a 400px column with lots of space: the logo and theme at the top, one quiet line at the foot, nothing else. No showcase panels, badges or quotes next to a form.
- **Home on a desk:** three columns that stack on their own (no gaps under short cards): balance and your pots; Up next (saving payments, circle payments, the day the pot is yours, from the API's own dates) and your circles; This month (money in and out, latest wallet payments) and friends. Only to-dos that need the person show above. No tiles or install prompt on a desk.
- **Home on a phone:** balance, four shortcuts (Save, Circles, Friends, Auto-debit), to-dos, Up next, then the summaries.
- **No sideways scrolling, ever.** The page clips sideways at `html` (`overflow-x: clip`, `hidden` on body for Safari before 16). A wide table scrolls inside its own card, never the page. Check with the headless audit at 375 and 768 before shipping.
- **Admin dashboard:** stats row (people, money held, money in, circles running), money in and out by day, "Waiting on the team", new people, where people are, circles and plans, latest payments (no names). Charts use `--chart-in` / `--chart-out` with a legend and a screen-reader table.
