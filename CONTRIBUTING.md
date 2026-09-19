# Contributing to SAMSON

## Development baseline

- Node.js 24
- locked dependency installation with `npm ci`
- feature branches based on the latest `main`
- no secrets, credentials, or production data in the repository

```bash
npm ci --no-audit --no-fund
npm run lint
npm run typecheck
npm run test:coverage
npm run test:tools
npm run build
npm run validate:security-headers
npm run test:e2e
```

Run `npm run test:e2e:masumi-crm` when MASUMI CRM UI, API contracts, authentication behavior, or shared CRM rules change.

## Coverage policy

`npm run test:coverage` enforces the following global thresholds for the deterministic modules covered by Vitest:

| Metric | Minimum |
|---|---:|
| Statements | 75% |
| Lines | 75% |
| Functions | 75% |
| Branches | 60% |

The measured scope is explicitly listed in `vitest.config.ts`. Browser-oriented UI, Cloudflare integration behavior, and shell-style regression scripts are protected by their dedicated regression and Playwright suites instead of being hidden inside an inflated unit-coverage number.

Do not lower a threshold or remove a file from coverage merely to make CI pass. Any scope or threshold change must explain the tradeoff and receive owner review.

## Branches and commits

Use focused branch names such as:

- `feat/<outcome>`
- `fix/<problem>`
- `docs/<topic>`
- `chore/<maintenance>`
- `security/<control>`

Write commit messages that describe the outcome, for example `test: enforce deterministic coverage floor`.

## Pull requests

A pull request must include:

- the intended outcome and bounded scope;
- risk classification and affected runtime/data boundaries;
- verification evidence, including relevant commands;
- screenshots only when visual behavior changed and only with synthetic data;
- deployment and rollback notes for runtime changes;
- explicit disclosure of AI-assisted implementation when material.

Generated code is not definition of done. The author remains responsible for correctness, security, licensing, tests, and reviewability.

## Security and privacy

Follow `SECURITY.md`. Never paste API keys, OTPs, Access tokens, real CRM leads, private contact data, or production exports into commits, logs, screenshots, issues, or pull requests. Use synthetic fixtures with unmistakable `TEST-` or `E2E-` identifiers.

## Merge boundary

Do not merge, deploy, mutate production data, change DNS/Access, or modify repository rulesets without the owner's explicit approval. Required checks and resolved conversations must remain green at the merge commit.
