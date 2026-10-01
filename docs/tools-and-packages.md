# Àjọ — Tools and Packages

Oct 1, 2026 · @olareign

Everything needed to build, test, ship and run Àjọ, from the first commit to production. Package names are npm names; pin the latest stable version when a package is added. Where two options are listed, the first is the recommendation.

The system is split into two repositories with separate responsibilities:

| Repository | Visibility | Owns |
| --- | --- | --- |
| `olareign/Ajo` | Public | Next.js PWA (UI only), its backend-for-frontend (BFF) layer, the admin app later, and the shared project docs |
| `olareign/ajo-api` | Private | NestJS API: every business rule, the ledger, payments, KYC, èsúsú engine, background jobs, partner adapters, database |

The web app holds no business logic and never talks to partners or the database. It calls the API only from its server side (the BFF), using a client generated from the API's OpenAPI spec.

## Shared across both repositories

| Tool or package | Purpose | Stage |
| --- | --- | --- |
| Node.js (LTS, 22+) | JavaScript runtime | Both |
| pnpm | Package manager | Dev |
| TypeScript (`typescript`, strict mode) | Typed code everywhere | Both |
| Docker and Docker Compose | Local Postgres (with PostGIS), Redis and Mailpit for the API | Dev |
| ESLint, Prettier | Linting and formatting | Dev, CI |
| GitHub Actions | CI: audit, lint, typecheck, tests, build, scans | CI |
| GitHub Dependabot | Dependency and GitHub Actions updates | CI |
| GitHub CodeQL (`security-extended`) | Static security analysis | CI |
| Gitleaks | Blocks committed secrets | CI |
| GitHub dependency review | Blocks pull requests adding vulnerable or disallowed-licence packages | CI |

## Web repository (`olareign/Ajo`)

Layout: a pnpm and Turborepo workspace with `apps/web` (the PWA) and, later, `apps/admin` (back office) and `packages/ui` when a second app needs shared components.

### Framework, UI and PWA

| Tool or package | Purpose | Stage |
| --- | --- | --- |
| Next.js (`next`, `react`, `react-dom`) | PWA screens and the BFF (route handlers that call the API server-side) | Both |
| Turborepo (`turbo`) | Runs tasks across apps with caching | Dev, CI |
| Tailwind CSS (`tailwindcss`, `@tailwindcss/postcss`) | Mobile-first styling with the Figma tokens | Both |
| `@fontsource-variable/montserrat` | Self-hosted brand font (no third-party font requests, strict CSP) | Both |
| shadcn/ui (with Radix UI primitives) | Accessible components when screens need dialogs, sheets and menus | Both |
| `lucide-react` | Icons | Both |
| `clsx` | Class handling | Both |
| `sonner` | Toast messages | Both |
| `vaul` | Bottom sheets (native-feeling on phones) | Both |
| `motion` | Animations, e.g. the live payout draw | Both |
| `recharts` | Savings progress and admin charts | Both |
| `@serwist/next` | Service worker and offline shell (never caches API responses holding personal data) | Both |
| `react-webcam` | Selfie capture during KYC (if the KYC provider has no web SDK) | Both |
| `qrcode.react` | Invite and friend QR codes | Both |

### Forms, data and state

| Tool or package | Purpose | Stage |
| --- | --- | --- |
| `openapi-typescript`, `openapi-fetch` | Typed API client generated from the API's OpenAPI spec; CI fails if it is out of date | Both |
| `zod` | Validates form input and the BFF's own request bodies before they reach the API | Both |
| `react-hook-form`, `@hookform/resolvers` | Forms (sign-up, KYC steps, group creation) | Both |
| `@tanstack/react-query` | Data fetching, caching and retries on slow networks (calls the BFF) | Both |
| `zustand` | Small client state (KYC wizard progress) | Both |
| `nuqs` | Filters and tabs kept in the URL | Both |
| `libphonenumber-js` | International phone number input and formatting | Both |
| `Intl` (built in) | Formatting money, numbers and dates for each locale; money arrives as integer-minor-unit strings | Both |
| `next-intl` | Translations; English first | Both |
| `@date-fns/tz`, `date-fns` | Showing schedules in the user's own time zone | Both |
| `@t3-oss/env-nextjs` | Type-checked environment variables; the build fails on a missing or malformed value | Both |

### Session and security (web)

| Tool or package | Purpose | Stage |
| --- | --- | --- |
| Next.js proxy (`src/proxy.ts`) | Per-request nonce-based Content Security Policy | Both |
| `next.config.ts` headers | HSTS, nosniff, frame denial, referrer and permissions policies | Both |
| `iron-session` or `jose` | Sealed httpOnly, Secure, SameSite=strict session cookies holding the API tokens; JavaScript never sees a token | Both |
| Cloudflare Turnstile | Bot protection on sign-up and OTP requests | Prod |

### Testing (web)

| Tool or package | Purpose | Stage |
| --- | --- | --- |
| Vitest (`vitest`, `@vitejs/plugin-react`, `jsdom`) | Unit and component tests | Dev, CI |
| Testing Library (`@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`) | Component tests by role and label | Dev, CI |
| Playwright (`@playwright/test`) | Journeys on phone-sized browsers; fails on CSP violations and console errors | Dev, CI |
| MSW (`msw`) | Mock the API in component and BFF tests | Dev, CI |
| Lighthouse CI | PWA, performance and accessibility scores | CI |

### Hosting (web)

| Service | Purpose | Stage |
| --- | --- | --- |
| Vercel | Web and admin hosting; preview deploy per pull request | Preview, Staging, Prod |
| Cloudflare | DNS, WAF, DDoS protection | Prod |

## API repository (`olareign/ajo-api`)

Layout: one NestJS application with one module per bounded context (identity, KYC, social, discovery, wallet and ledger, payments, solo savings, èsúsú, trust, defaults, notifications, admin) and a separate worker entry point for background jobs, deployed from the same image.

### Framework and API

| Tool or package | Purpose | Stage |
| --- | --- | --- |
| NestJS (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`) | API framework, modules, dependency injection | Both |
| `@nestjs/config` with `zod` | Configuration validated at startup; the app refuses to boot on a missing or bad value | Both |
| `class-validator`, `class-transformer` | DTO validation with a global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) | Both |
| `@nestjs/swagger` | OpenAPI spec generated from DTOs; source of the web client | Both |
| `@nestjs/terminus` | Liveness and readiness health checks | Both |
| `helmet` | Security headers on every API response | Both |
| `@nestjs/throttler` with Redis storage | Rate limits on OTP, login, PIN, search and money endpoints | Both |
| `nestjs-pino`, `pino` | Structured JSON logs with request IDs; personal data and secrets redacted | Both |

### Data

| Tool or package | Purpose | Stage |
| --- | --- | --- |
| PostgreSQL 16+ with PostGIS | Main database; distance queries for nearby people and groups | Both |
| TypeORM (`typeorm`, `@nestjs/typeorm`, `pg`) | Entities, repositories, transactions and migrations | Both |
| TypeORM CLI migrations | Every schema change is a reviewed migration | Both |
| `ngeohash` | Coarse location cells for discovery privacy | Both |

### Identity, auth and crypto

| Tool or package | Purpose | Stage |
| --- | --- | --- |
| `@nestjs/passport`, `passport-jwt` or `jose` | Short-lived access tokens; rotating, revocable refresh tokens | Both |
| `argon2` | Hashing passwords and transaction PINs (argon2id) | Both |
| `otpauth` | Authenticator-app codes (TOTP, RFC 6238) and enrolment QR payloads | Both |
| Have I Been Pwned Pwned Passwords API (k-anonymity) | Rejects passwords known from breaches without sending the password | Both |
| Node `crypto` (AES-256-GCM) with a KMS-held key | Field-level encryption of ID numbers, BVN and exact location | Both |
| `libphonenumber-js` | Phone number validation (E.164) | Both |

### Jobs, cache and real time

| Tool or package | Purpose | Stage |
| --- | --- | --- |
| BullMQ (`bullmq`, `@nestjs/bullmq`) | Scheduled debits, retries with backoff, payouts, reminders, reconciliation; failed jobs kept for review | Both |
| Redis (`ioredis`) | BullMQ queues, rate limits, cache | Both |
| Server-sent events (NestJS `@Sse`) | Live spot picking and round status board | Both |

### Integrations

| Tool or package | Purpose | Stage |
| --- | --- | --- |
| `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` | Private KYC files (S3 or Cloudflare R2) with short-lived signed links | Both |
| `sharp` | Compress uploads and strip image metadata (e.g. GPS) | Both |
| Provider SDKs (`stripe`, `gocardless-nodejs`, `twilio`, `resend`, KYC SDKs) | Called only from adapters, routed by country | Both |
| `web-push` | Web Push notifications | Both |

### Testing (API)

| Tool or package | Purpose | Stage |
| --- | --- | --- |
| Vitest (`vitest`, `@vitest/coverage-v8`, `@nestjs/testing`) | Unit and module tests (NestJS 12 ESM template default) | Dev, CI |
| oxlint (`oxlint`, `oxlint-tsgolint`) | Type-aware linting (NestJS 12 template default) | Dev, CI |
| `supertest` | HTTP-level tests of controllers, guards and pipes | Dev, CI |
| Testcontainers (`@testcontainers/postgresql`, `@testcontainers/redis`) | Integration tests against real Postgres and Redis | CI |
| `nock` or MSW | Mock partner APIs in adapter tests | Dev, CI |
| `@faker-js/faker` | Test and seed data | Dev |
| k6 | Load tests for debit, payout and discovery | Pre-launch |

### Hosting (API)

| Service | Purpose | Stage |
| --- | --- | --- |
| Render (Blueprint in `render.yaml`) | API and worker containers, managed Postgres and Key Value (Redis), private networking, pre-deploy migrations | Staging, Prod |
| Doppler or Infisical (or the host's secret store) | Secrets per environment, never in code or images | All |
| Cloudflare R2 or AWS S3 | KYC document storage | Staging, Prod |

Before real money moves, confirm the chosen host offers: encryption at rest, private networking between API, database and Redis, point-in-time recovery, audit logs of console access, and a data processing agreement. If it cannot, move to AWS (ECS Fargate, RDS, ElastiCache) using the same Docker image.

## Monitoring, security and analytics

| Tool or service | Purpose | Stage |
| --- | --- | --- |
| Sentry (`@sentry/nextjs`, `@sentry/nestjs`) | Error tracking and traces; personal data scrubbed | Staging, Prod |
| OpenTelemetry (`@opentelemetry/sdk-node`) | Traces across BFF, API and jobs | Staging, Prod |
| Better Stack (Logtail) or Axiom | Log storage and search | Staging, Prod |
| Better Stack Uptime or UptimeRobot | Uptime checks and public status page | Prod |
| PostHog (`posthog-js`, `posthog-node`) | Product analytics and funnels; no personal data in events | Staging, Prod |
| Slack or similar | Alerts channel for on-call | Prod |
| OWASP ZAP | Automated security scan of staging | Pre-launch |
| External penetration testing firm | Independent security test | Pre-launch, then regularly |
| FingerprintJS | Device fingerprinting for fraud checks | Prod (optional) |

## External services

Partners selected for Nigeria (NGN) and the United Kingdom (GBP). Contracts, pricing and sandbox access are still to arrange (P0.3); until then each one is an adapter with a tested in-memory stand-in. All are called only from the API.

| Need | Nigeria | United Kingdom | Integration |
| --- | --- | --- | --- |
| KYC and identity (ID documents, selfie and liveness; NIN and BVN in Nigeria) | Smile ID | Onfido | REST API and web SDK |
| AML and sanctions screening, ongoing monitoring | ComplyAdvantage | ComplyAdvantage | REST API and webhooks |
| Collections and auto-debit | Paystack (NIBSS Direct Debit, cards, transfers in) | GoCardless (Bacs Direct Debit) | REST API and webhooks |
| Payouts to bank accounts | Paystack Transfers | Modulr (Faster Payments from the safeguarded account) | REST API and webhooks |
| Licensed fund holding | To be chosen with Nigerian legal counsel after the CBN review (P0.2): a partner bank or banking-as-a-service provider | Modulr (FCA e-money institution, safeguarded) at launch; ClearBank (licensed bank, FSCS-protected deposits) when scale requires | Partner API |
| Currency exchange and cross-border transfers | Wise Platform | Wise Platform | REST API and webhooks |
| Email (verification, password reset, security alerts) | Resend (with `@react-email/components` templates) | Resend | REST API |
| SMS and WhatsApp alerts | Termii | Twilio | REST API |
| Push notifications | Web Push (VAPID); Firebase Cloud Messaging for native later | Same | Server SDK |
| Error tracking | Sentry | Sentry | SDK |
| Logs, uptime and status page | Better Stack | Better Stack | Log drain and HTTP checks |
| Maps and area names (Phase 3) | OpenStreetMap Nominatim | OpenStreetMap Nominatim | REST API |

Considered and not selected: Sumsub, Veriff, Dojah, Prembly (KYC); Stripe, Mono, Flutterwave, TrueLayer (collections); Griffin, Railsr (UK fund holding); Currencycloud, Thunes (FX); Postmark, Amazon SES (email); Africa's Talking (SMS).

## Team, design and project tools

| Tool | Purpose |
| --- | --- |
| Figma | Wireframes, prototype, design system |
| Linear, Jira or GitHub Projects | Feature tickets by epic and phase |
| Notion or Claude Docs | Specs, architecture, runbooks, meeting notes |
| Excalidraw or FigJam | Architecture and flow diagrams |
| Slack or WhatsApp group | Team communication and alerts |
| Google Workspace | Email, shared files, calendar |
| 1Password or Bitwarden | Shared team passwords and recovery codes; hardware keys for admin accounts |
| Freshdesk, Intercom or Crisp | Customer support inbox and help centre (from Phase 5) |
| Postman or Bruno | Trying APIs and provider sandboxes |

## Native mobile phase

Added only in Phase 6; the API, database and jobs stay the same. The app calls the API directly with bearer tokens.

| Tool or package | Purpose |
| --- | --- |
| Expo and React Native (`expo`, `react-native`) | Native iOS and Android app |
| Expo Router (`expo-router`) | Screens and navigation |
| NativeWind (`nativewind`) | Tailwind styling on mobile, reusing the design tokens |
| `expo-camera`, `expo-image-picker` | KYC selfie and document capture |
| `expo-location` | Location for KYC and nearby discovery |
| `expo-local-authentication` | Fingerprint or Face ID instead of typing the PIN |
| `expo-secure-store` | Secure token storage on the device (Keychain, Keystore) |
| `expo-notifications` with Firebase Cloud Messaging and Apple Push | Push notifications |
| `expo-contacts` | Opt-in contact matching |
| EAS Build and EAS Submit | Build and publish to Google Play and the App Store |
| Sentry (`@sentry/react-native`) | Mobile error tracking |
| `openapi-fetch`, `@tanstack/react-query`, `zustand`, `date-fns` | Same client libraries as the web app, generated from the same OpenAPI spec |
