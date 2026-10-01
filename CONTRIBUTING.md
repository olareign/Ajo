# Contributing to Àjọ

## Setup

```sh
corepack enable        # uses the pnpm version pinned in package.json
pnpm install
pnpm dev               # web app on http://localhost:3000
```

| Command                             | What it does                                                     |
| ----------------------------------- | ---------------------------------------------------------------- |
| `pnpm test`                         | Unit and component tests in every package (Vitest)               |
| `pnpm test:watch`                   | Tests in watch mode, for the TDD loop                            |
| `pnpm typecheck`                    | TypeScript across the monorepo                                   |
| `pnpm build`                        | Production build                                                 |
| `pnpm format` / `pnpm format:check` | Prettier                                                         |
| `pnpm --filter @ajo/web test:e2e`   | Playwright journeys on a phone viewport (run `pnpm build` first) |

## Repository layout

| Path              | Contents                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/domain` | Pure business rules with no framework code: money, ledger, calendar dates, solo plans, èsúsú rules. 100% test coverage is enforced.  |
| `apps/web`        | Next.js PWA. `src/components` holds design-system pieces, `src/features` holds screens and their state, `src/app` holds routes only. |
| `docs/`           | Product spec, architecture, plan, tools and the design system                                                                        |

## Test-driven development

All code is written test first. For each behaviour:

1. **Red:** write a test that describes the behaviour in the words of the product spec or the design, and watch it fail.
2. **Green:** write the simplest code that passes.
3. **Refactor:** tidy up with the tests still green.

Guidelines:

- **Money logic is tested to 100%.** `packages/domain` fails the build below full line, branch and function coverage (docs/project-plan.md, Definition of Done). An uncovered branch is either a missing test or dead code.
- **Put rules in `packages/domain`, not in components.** A rule like "early spots go to trusted members" is tested once as a plain function and reused by the web app, the API and later the mobile app.
- **Test screens the way a user uses them.** Component tests use Testing Library queries by role and label (`getByRole("button", { name: "Proceed" })`), never CSS classes. This also keeps the app accessible.
- **Keep screen logic in reducers.** Multi-step flows (e.g. `features/solo-plan/wizard.ts`) keep their state in a pure reducer with its own unit tests, and the component test covers the journey.
- **End-to-end tests cover journeys, not details.** Playwright runs the main flows on a Pixel 5 viewport and checks that pages never scroll sideways.
- **Name tests after behaviour**, e.g. `"keeps early spots for trusted members even if they joined later"`.
