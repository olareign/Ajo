# Àjọ

Àjọ is a global, mobile-first savings app for people at home and in the diaspora. Save on your own, or join rotating èsúsú groups (also known as susu, chama or tontine) with friends you trust.

## How it works

- **Solo savings:** set an amount, a schedule and a duration; deposits are automatic.
- **Èsúsú groups:** a fixed number of members each pay a fixed amount every round, and each round the whole pot goes to one member, by spot number, until everyone has received it once.
- **Friends and discovery:** after identity checks, users build a list of people they trust and find groups through friends, mutual friends, location and diaspora communities.
- **Across borders:** each group has one currency; members paying from another currency get an exchange-rate quote first.

## Repositories

| Repository                        | What it holds                                                                                      |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| `olareign/Ajo` (this one, public) | The Next.js PWA (screens only, plus a server-side BFF that holds the session) and the project docs |
| `olareign/ajo-api` (private)      | The NestJS API: every business rule, the ledger, payments, KYC, the èsúsú engine, background jobs  |

## Status

Phase 1, identity and wallet, in progress. Done: sign-up with email confirmation (with resend), sign-in with sessions and refresh rotation, password recovery, authenticator-app second factor, onboarding with a transaction PIN, the double-entry ledger with the wallet view (API), and the wallet screens (balances per currency and activity). Still to build: KYC, funding, mandates and withdrawals. The web app has the design system, a nonce-based Content Security Policy and security headers, and CI with dependency audit, secret scanning, CodeQL and dependency review. The API is in `olareign/ajo-api` (NestJS, TypeORM, BullMQ, Render Blueprint). See the [Phase 0 checklist](docs/project-plan.md#phase-0-planning-and-foundations) and the [feature backlog](docs/project-plan.md#feature-backlog-by-epic).

```sh
pnpm install && pnpm test && pnpm dev
```

## Documents

| Document                                               | What it covers                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| [Product spec](docs/product-spec.md)                   | What the app does, group rules, decisions and open questions                    |
| [Solution architecture](docs/solution-architecture.md) | System design, threat model, data model, API, integrations, security            |
| [Project plan](docs/project-plan.md)                   | Phases, epics and features with acceptance criteria, risks, go-live checklist   |
| [Progress checklist](docs/progress.md)                 | What is done, working, failing and not started, per plan bullet                 |
| [Tools and packages](docs/tools-and-packages.md)       | Every tool, package and service, per repository, from development to production |
| [Design system](docs/design-system.md)                 | Tokens and components from Figma, and where the build departs from the designs  |
| [Contributing](CONTRIBUTING.md)                        | Setup, commands, branching and the TDD workflow                                 |
| [Security policy](SECURITY.md)                         | How to report a vulnerability                                                   |
