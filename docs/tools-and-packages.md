# Àjọ — Tools and Packages

Oct 1, 2026 · @olareign

Everything needed to build, test, ship and run Àjọ, from the first commit to production. Package names are npm names; pin the latest stable version when the project is set up. Where two options are listed, the first is the recommendation.

## Core app

| Tool or package | Purpose | Stage |
| --- | --- | --- |
| Node.js (LTS) | JavaScript runtime | Both |
| pnpm | Package manager with workspaces for the monorepo | Dev |
| Turborepo (`turbo`) | Runs builds, tests and lint across apps and packages with caching | Dev, CI |
| TypeScript (`typescript`) | Typed code everywhere | Both |
| Next.js (`next`, `react`, `react-dom`) | Web app, admin app and API route handlers | Both |
| Docker and Docker Compose | Local Postgres, Redis and mail catcher | Dev |

Monorepo layout: `apps/web`, `apps/admin`, `packages/api-contracts` (shared schemas and types), `packages/db`, `packages/ui`, `packages/config`.

## UI, styling and PWA

| Tool or package | Purpose | Stage |
| --- | --- | --- |
| Tailwind CSS (`tailwindcss`) | Mobile-first styling | Both |
| shadcn/ui (with Radix UI primitives) | Accessible components copied into `packages/ui` | Both |
| `lucide-react` | Icons | Both |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Component variants and class handling | Both |
| `next-themes` | Light and dark mode | Both |
| `sonner` | Toast messages | Both |
| `vaul` | Bottom sheets (native-feeling on phones) | Both |
| `motion` (Framer Motion) | Animations, e.g. the live payout draw | Both |
| `recharts` | Savings progress and admin charts | Both |
| `date-fns` | Date maths for schedules and display | Both |
| `@serwist/next` | Service worker, offline shell and installable PWA | Both |
| `web-push` | Sending Web Push notifications (server side) | Both |
| `react-webcam` | Selfie capture during KYC (if the KYC provider has no web SDK) | Both |
| `qrcode.react` | Invite and friend QR codes | Both |

## Forms, validation, data fetching and state

| Tool or package | Purpose | Stage |
| --- | --- | --- |
| `zod` | Schemas for every API request and response, shared by server and client | Both |
| `react-hook-form`, `@hookform/resolvers` | Forms (sign-up, KYC steps, group creation) with zod validation | Both |
| `@tanstack/react-query` | Server data fetching, caching and retries on slow networks | Both |
| `zustand` | Small client state (KYC wizard progress, UI state) | Both |
| `nuqs` | Filters and tabs kept in the URL | Both |
| `libphonenumber-js` | International phone number parsing, validation and formatting | Both |
| `dinero.js` | Multi-currency money maths and formatting with integer amounts (no floating point) | Both |
| `next-intl` | Translations and locale-aware routing; English first, more languages later | Both |
| `Intl` (built into JavaScript) | Formatting currencies, numbers and dates for each locale | Both |
| `@date-fns/tz` | Time-zone-aware schedules (collection dates in the group's time zone) | Both |
| `i18n-iso-countries`, `currency-codes` | Country and currency lists and names | Both |
| Crowdin or Lokalise | Managing translations with translators | Dev |

## Backend

| Tool or package | Purpose | Stage |
| --- | --- | --- |
| PostgreSQL with PostGIS | Main database; distance queries for nearby people and groups | Both |
| Neon or Supabase (managed Postgres) | Hosted database with branching for preview environments and point-in-time recovery | Prod, Preview |
| Drizzle ORM (`drizzle-orm`, `drizzle-kit`) or Prisma (`prisma`, `@prisma/client`) | Typed queries and migrations | Both |
| `pg` | Postgres driver | Both |
| Better Auth (`better-auth`) | Phone OTP, sessions, device management; works for web and mobile | Both |
| `argon2` | Hashing transaction PINs | Both |
| `jose` | Signing and verifying tokens | Both |
| Inngest (`inngest`) or Trigger.dev (`@trigger.dev/sdk`) | Durable scheduled jobs: debits, retries, payouts, reminders, reconciliation | Both |
| Redis via Upstash (`@upstash/redis`) | Cache for suggestions, sessions | Both |
| `@upstash/ratelimit` | Rate limits on OTP, search and money endpoints | Both |
| S3-compatible storage: Cloudflare R2 or AWS S3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) | Private KYC files with short-lived signed links | Both |
| `sharp` | Compress and strip metadata from uploaded images | Both |
| Server-sent events, or Pusher / Ably | Live updates for spot picking and round status | Both |
| `ngeohash` | Coarse location cells for discovery privacy | Both |
| `pino` | Structured logging | Both |
| `nanoid` or `uuid` | IDs and idempotency keys | Both |

## External services

Choose providers per launch country in Phase 0; a global provider plus a regional one often covers both home and diaspora users. Pricing and country coverage have not been checked yet.

| Need | Services | Integration |
| --- | --- | --- |
| KYC: global ID documents, liveness; NIN and BVN in Nigeria | Sumsub, Onfido, Veriff, Persona (global); Smile ID, Dojah, Prembly (Africa) | Provider REST API and web SDK |
| AML and sanctions screening | ComplyAdvantage, or the KYC provider's built-in screening | REST API and webhooks |
| Collections and auto-debit | Stripe (`stripe`), GoCardless (`gocardless-nodejs`) for UK, EU, US, Canada and more; Paystack, Flutterwave, Mono for Africa | REST API and webhooks |
| Payouts to bank accounts | Stripe, Wise Platform, Paystack Transfers, Flutterwave Transfers | REST API and webhooks |
| Currency exchange and cross-border transfers | Wise Platform, Flutterwave, Thunes, Currencycloud | REST API and webhooks |
| Open banking (bank-account checks, pay by bank) | Plaid (US, Canada), TrueLayer (UK, EU), Mono (Nigeria) | REST API and web SDK |
| Licensed fund holding | Licensed banks or e-money institutions per market through banking-as-a-service; non-interest banks for halal products | Partner API |
| SMS and OTP | Twilio (`twilio`) global; Termii, Africa's Talking for Africa | REST API |
| WhatsApp messages and OTP | WhatsApp Business Platform (via Twilio or Meta) | REST API |
| Email | Resend (`resend`, `@react-email/components` for templates), Postmark | REST API |
| Push notifications | Web Push (VAPID) now; Firebase Cloud Messaging (`firebase-admin`) for native later | Server SDK |
| Maps and area names | OpenStreetMap Nominatim, or Google Maps Geocoding | REST API |

## Testing

| Tool or package | Purpose | Stage |
| --- | --- | --- |
| Vitest (`vitest`) | Unit and integration tests | Dev, CI |
| Testing Library (`@testing-library/react`, `@testing-library/user-event`) | Component tests | Dev, CI |
| Playwright (`@playwright/test`) | End-to-end tests on phone-sized browsers | Dev, CI |
| MSW (`msw`) | Mock KYC, payment and SMS providers in tests | Dev, CI |
| Testcontainers (`testcontainers`) | Real Postgres in integration tests | CI |
| `@faker-js/faker` | Test and seed data | Dev |
| k6 | Load tests for debit, payout and discovery | Pre-launch |
| Mailpit | Catch emails locally | Dev |
| Provider sandboxes | Paystack, Flutterwave and KYC test modes | Staging |
| Lighthouse CI | PWA, performance and accessibility scores | CI |

## Code quality and developer workflow

| Tool or package | Purpose | Stage |
| --- | --- | --- |
| Git and GitHub | Source control, pull requests, code review | Dev |
| ESLint (`eslint`, `eslint-config-next`) or Biome (`@biomejs/biome`) | Linting | Dev, CI |
| Prettier (`prettier`, `prettier-plugin-tailwindcss`) | Formatting (skip if using Biome) | Dev, CI |
| Husky (`husky`) and `lint-staged` | Run lint and format before each commit | Dev |
| Commitlint (`@commitlint/cli`, `@commitlint/config-conventional`) | Consistent commit messages | Dev |
| Changesets (`@changesets/cli`) | Versioning and changelogs | Dev |
| `@t3-oss/env-nextjs` | Type-checked environment variables | Both |
| OpenAPI generator (`zod-openapi` or `@asteasolutions/zod-to-openapi`) | API docs generated from zod schemas | Dev |
| Scalar or Swagger UI | Browsable API docs for the team | Dev |
| Drizzle Studio or Prisma Studio | Inspect local and staging data | Dev |
| VS Code with ESLint, Prettier, Tailwind CSS IntelliSense extensions | Editor setup | Dev |
| Claude Code | AI pair-programming and code review | Dev |

## CI/CD, hosting and infrastructure

| Tool or service | Purpose | Stage |
| --- | --- | --- |
| GitHub Actions | CI pipeline: type-check, lint, tests, build, scans | CI |
| Vercel | Hosting for web and admin apps; preview deploy per pull request | Preview, Staging, Prod |
| Neon or Supabase | Managed Postgres with branches per preview, backups, point-in-time recovery | Preview, Staging, Prod |
| Upstash | Managed Redis | Staging, Prod |
| Cloudflare R2 or AWS S3 | File storage for KYC documents | Staging, Prod |
| Inngest Cloud or Trigger.dev Cloud | Hosted job runner | Staging, Prod |
| Cloudflare | DNS, domain, DDoS protection, web application firewall | Prod |
| Vercel environment variables, or Doppler / Infisical | Secret management per environment | All |
| GitHub Dependabot or Renovate | Automatic dependency updates | CI |

If the team later needs more control or lower cost at scale, the same app can move to AWS (ECS or App Runner, RDS Postgres, ElastiCache) using Docker images.

## Monitoring, security and analytics

| Tool or service | Purpose | Stage |
| --- | --- | --- |
| Sentry (`@sentry/nextjs`) | Error tracking and performance traces | Staging, Prod |
| Better Stack (Logtail) or Axiom | Log storage and search | Staging, Prod |
| Better Stack Uptime or UptimeRobot | Uptime checks and public status page | Prod |
| OpenTelemetry (`@vercel/otel`) | Traces across API and jobs | Staging, Prod |
| PostHog (`posthog-js`, `posthog-node`) | Product analytics, funnels, feature flags | Staging, Prod |
| Slack or similar | Alerts channel for on-call | Prod |
| Snyk or GitHub code scanning (CodeQL) | Code and dependency vulnerability scanning | CI |
| Gitleaks or GitHub secret scanning | Stop secrets being committed | CI |
| OWASP ZAP | Automated security scan of staging | Pre-launch |
| External penetration testing firm | Independent security test | Pre-launch, then regularly |
| Cloudflare Turnstile | Bot protection on sign-up and OTP | Prod |
| FingerprintJS | Device fingerprinting for fraud checks | Prod (optional) |

## Team, design and project tools

| Tool | Purpose |
| --- | --- |
| Figma | Wireframes, prototype, design system |
| Linear, Jira or GitHub Projects | Feature tickets by epic and phase |
| Notion or Claude Docs | Specs, architecture, runbooks, meeting notes |
| Excalidraw or FigJam | Architecture and flow diagrams |
| Slack or WhatsApp group | Team communication and alerts |
| Google Workspace | Email, shared files, calendar |
| 1Password or Bitwarden | Shared team passwords and recovery codes |
| Freshdesk, Intercom or Crisp | Customer support inbox and help centre (from Phase 5) |
| Postman or Bruno | Trying APIs and provider sandboxes |

## Native mobile phase

Added only in Phase 6; the API, database and jobs stay the same.

| Tool or package | Purpose |
| --- | --- |
| Expo and React Native (`expo`, `react-native`) | Native iOS and Android app |
| Expo Router (`expo-router`) | Screens and navigation |
| NativeWind (`nativewind`) | Tailwind styling on mobile, reusing the design tokens |
| `expo-camera`, `expo-image-picker` | KYC selfie and document capture |
| `expo-location` | Location for KYC and nearby discovery |
| `expo-local-authentication` | Fingerprint or Face ID instead of typing the PIN |
| `expo-secure-store` | Secure token storage on the device |
| `expo-notifications` with Firebase Cloud Messaging and Apple Push | Push notifications |
| `expo-contacts` | Opt-in contact matching |
| EAS Build and EAS Submit | Build and publish to Google Play and the App Store |
| Sentry (`@sentry/react-native`) | Mobile error tracking |
| Shared packages: `@tanstack/react-query`, `zod`, `zustand`, `date-fns` | Same libraries as the web app |
