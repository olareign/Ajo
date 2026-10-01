# Àjọ

Àjọ is a global, mobile-first savings app for people at home and in the diaspora. Save on your own, or join rotating èsúsú groups (also known as susu, chama or tontine) with friends you trust. Built with Next.js.

## How it works

- **Solo savings:** set an amount, a schedule and a duration; deposits are automatic.
- **Èsúsú groups:** a fixed number of members each pay a fixed amount every round, and each round the whole pot goes to one member, by spot number, until everyone has received it once.
- **Friends and discovery:** after identity checks, users build a list of people they trust and find groups through friends, mutual friends, location and diaspora communities.
- **Across borders:** each group has one currency; members paying from another currency get an exchange-rate quote first.

## Status

Phase 0 foundations, built test first (see [CONTRIBUTING.md](CONTRIBUTING.md)):

- `packages/domain`: money in minor units, double-entry ledger, calendar dates, solo plan schedules, and èsúsú rules (early spots, deposits, payout order by join order, verifiable random draw or finger pick, rounds and payouts). 100% test coverage.
- `apps/web`: Next.js PWA with the Figma design tokens and components, onboarding, the solo savings plan wizard, and the groups list (sample data). There is no backend yet.

```sh
pnpm install && pnpm test && pnpm dev
```

## Documents

| Document                                               | What it covers                                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| [Product spec](docs/product-spec.md)                   | What the app does, group rules, decisions and open questions                                            |
| [Solution architecture](docs/solution-architecture.md) | System design, data model, API, integrations, security                                                  |
| [Project plan](docs/project-plan.md)                   | Phases, epics and features with acceptance criteria, risks, go-live checklist                           |
| [Tools and packages](docs/tools-and-packages.md)       | Every tool, package and service from development to production                                          |
| [Design system](docs/design-system.md)                 | Tokens and components from Figma, build status per screen, and where the build departs from the designs |
| [Contributing](CONTRIBUTING.md)                        | Setup, commands and the TDD workflow                                                                    |
