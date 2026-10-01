# Contributing to Àjọ

This repository holds the web app (Next.js PWA) and the project docs. All business logic lives in the private API repository, `olareign/ajo-api`.

## Setup

```sh
corepack enable        # uses the pnpm version pinned in package.json
pnpm install
pnpm dev               # web app on http://localhost:3000
```

| Command                             | What it does                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| `pnpm test`                         | Unit and component tests (Vitest, Testing Library)                                                 |
| `pnpm test:watch`                   | Tests in watch mode, for the TDD loop                                                              |
| `pnpm lint`                         | ESLint, zero warnings allowed                                                                      |
| `pnpm typecheck`                    | TypeScript                                                                                         |
| `pnpm build`                        | Production build                                                                                   |
| `pnpm format` / `pnpm format:check` | Prettier                                                                                           |
| `pnpm --filter @ajo/web test:e2e`   | Playwright on a phone viewport (run `pnpm build` first); fails on CSP violations or console errors |

## Repository layout

| Path                      | Contents                                                               |
| ------------------------- | ---------------------------------------------------------------------- |
| `apps/web/src/app`        | Routes only                                                            |
| `apps/web/src/components` | Design-system components from Figma                                    |
| `apps/web/src/lib`        | Display helpers, e.g. money formatting from integer-minor-unit strings |
| `apps/web/src/security`   | Security headers and the Content Security Policy                       |
| `apps/web/src/proxy.ts`   | Adds a fresh CSP nonce to every page                                   |
| `docs/`                   | Product spec, architecture, plan, tools and the design system          |

## Branches and pull requests

- Work is delivered phase by phase: one branch and one pull request per phase, named `phase-N/<slug>`, started from `main` after the previous phase has merged.
- Fill in the pull request template, including the security checklist.
- CI must be green: dependency audit, format, lint, type-check, tests, build, end-to-end tests, secret scan, CodeQL and dependency review.

## Test-driven development

All code is written test first. For each behaviour:

1. **Red:** write a test that describes the behaviour in the words of the product spec or the design, and watch it fail.
2. **Green:** write the simplest code that passes.
3. **Refactor:** tidy up with the tests still green.

Guidelines:

- **No business rules in the web app.** If a rule decides money, eligibility or permissions, it belongs in the API and is tested there. The web app may validate input for a better experience, but the API always re-validates.
- **Test screens the way a user uses them.** Query by role and label (`getByRole("button", { name: "Proceed" })`), never by CSS class. This also keeps the app accessible.
- **Keep screen logic in reducers.** Multi-step flows keep their state in a pure reducer with its own unit tests; the component test covers the journey.
- **Security behaviour is tested like any other behaviour**: headers, CSP, cookie flags, and that the browser never receives a token.
- **Name tests after behaviour**, e.g. `"never allows eval or inline scripts in production"`.

## Security rules

- Never commit secrets, tokens, internal hostnames, partner account details or real personal data, including in tests, fixtures and screenshots. This repository is public.
- No `dangerouslySetInnerHTML`, `eval` or new script sources without a security review; the CSP will block them anyway.
- The browser only talks to this app's own origin. API calls happen server-side in the BFF.
- Report vulnerabilities privately; see [SECURITY.md](SECURITY.md).
