# Àjọ — Design System (from Figma)

Oct 1, 2026 · @olareign

Inferred from the Figma file *Alo App (Saving App Design Template)*. Tokens live in `apps/web/src/app/globals.css` (Tailwind `@theme`); components live in `apps/web/src/components`.

## Tokens

| Token | Value | Used for |
| --- | --- | --- |
| `brand-600` | `#038641` | Primary buttons, selected chips and tabs, eyebrow text ("Lets Go!"), payout amounts, splash screen |
| `brand-700` | `#026B34` | Pressed or hover state of primary |
| `brand-200` | `#C2E1D1` | Disabled Proceed button |
| `brand-100` | `#E3F5EA` | "Active", "Member" and "Admin" pills |
| `brand-50` | `#F2FBF6` | Tinted panels ("Benefits", plan summary), bottom nav |
| `ink` / `ink-muted` | `#111111` / `#6B7280` | Headings / secondary labels |
| `line` | `#D9D9D9` | Chip and input borders |
| `surface-muted` | `#F7F8F9` | Cards, auth inputs, tab track |
| `danger` | `#E53935` | "2/7 remaining", errors |
| Font | Montserrat (variable, self-hosted) | All text; the auth screens in Figma use Inter or Roboto, which are unified here |
| Radius | 8px fields and buttons; full pills for chips | |

## Components

| Component | Figma source | Notes |
| --- | --- | --- |
| `Button` | Proceed, Get Started, Chat Room, Cancel | Full width, 48px tall; `primary` and `outline` |
| `ChoiceChips` | Amount, How Often?, Duration pills | An accessible radio group with arrow-key support |
| `TextField` | Plan Name, Group Name, No of People ("Max 12") | Label above; hint inside on the right; error below |
| `ScreenHeader` | Back chevron, green eyebrow, bold question | Used by every wizard screen |
| `GroupCard` | Groups list cards | Phase 4: avatars (+N), status pill, payout, due date, amount per frequency, fill bar, "x/y remaining" |
| `ProgressBar` | Card fill bar | |
| `BottomNav` | Home, Groups, Wallet, More | |

## Screens in Figma and build status

Screens are built in the phase that delivers their feature; Phase 0 ships the design tokens, core components and the splash screen.

| Flow | Figma frames | Phase |
| --- | --- | --- |
| Splash | Splash | Phase 0: built (`/`) |
| Onboarding | Onboarding 1–2 | Phase 1 (E1.6) |
| Sign in, sign up, verification code, password reset | Screens 4–12 | Phase 1 (E1) |
| Wallet | Wallets | Phase 1 (E3) |
| Solo savings | SELECT SAVINGS, Your selections, success | Phase 2 (E4) |
| Referral and invites | Refferal, Linkshare | Phase 3 (E5.9) |
| Group type, private group setup, success | Groupss | Phase 4 (E6.1) |
| Groups list | Groups / Your Groups | Phase 4 (E6.3) |
| Group info, share link, chat room | Invites, Group Info, Linkshare | Phase 4 (E6.2, E6.3); group chat is out of scope for version 1 |
| Account, notifications | Account, Notification Page | Phase 1 (profile) and E8.3 |

## Where the build departs from Figma, and why

| Figma | Built | Reason |
| --- | --- | --- |
| "Earn Interest", "Interest Rate 7.5 pa", "Invest group savings to earn more interest" | No interest anywhere; the estimate equals what the user pays in | Product spec: no interest, rewards must be Sharia-compatible |
| Brand name "Alajo" | "Àjọ" | Name used in the repo docs; the app name is still an open question in the spec |
| Sign in and sign up with email and password, plus Google and Apple | Email and password chosen (Phase 1); Google and Apple buttons pending a decision | The spec now follows the designs for sign-in; a transaction PIN still guards money actions |
| "Specify Interval" | Daily, weekly or monthly only | Spec and data model support only these three frequencies |
| Both onboarding slides say "Get Started" | "Next" on slide 1, "Get Started" on the last | Clearer progression; Skip still jumps ahead |
| Date "Jan 19" | Dates formatted for the user's locale ("19 Jan" in en-NG) | Spec E11.7 |
| No of People "Max 12" | Group size 2–12 (`DEFAULT_RULES.maxGroupSize`) | Taken from the design; change in one place if needed |
| Photo avatars | Initials | No profile photos until KYC and profiles exist |
