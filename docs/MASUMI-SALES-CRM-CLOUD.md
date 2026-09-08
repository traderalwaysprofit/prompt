# MASUMI Sales CRM Cloud

Status: **Step 8 application-complete / Draft PR**

Canonical requirements: [GitHub Issue #53](https://github.com/traderalwaysprofit/prompt/issues/53)

Baseline: MASUMI Sales CRM local-only from PR #52

## Approved direction

- The public Tools Hub remains at `samson.web.id`.
- The authenticated CRM application will run at `crm.samson.web.id`.
- Cloudflare Worker will be the API and trust boundary.
- Cloudflare D1 will become the system of record after migration.
- Cloudflare Access email OTP will protect the hostname.
- Samson is Admin; Bu Lita and Bu Mei are Sales.
- Admin can access all leads. Sales can access only leads they own.
- Preview and production resources must remain isolated.
- No production data may enter fixtures, logs, screenshots, issues, or PR comments.

## Current implementation

This branch introduces only reversible repository foundations:

- a separate static application source in `apps/masumi-crm/`;
- a separate Worker entrypoint in `worker/masumi-crm/`;
- a separate build output in `dist-crm/`;
- `wrangler.crm.jsonc` with preview/production environment boundaries;
- a public, non-sensitive health endpoint at `/api/crm/v1/health`;
- authenticated session and lead endpoints behind Cloudflare Access JWT verification;
- an operational four-theme lead-register interface with no sample prospect data;
- security headers specific to the CRM hostname;
- an executable D1 migration for `app_users`, `leads`, `import_jobs`, and `audit_logs`;
- database constraints for canonical pipeline stages, Lost reason, score ranges, ownership references, the 2,000-active-lead limit, and committed-import idempotency;
- network-free SQLite integration tests that execute the D1-compatible migration in CI.
- Admin/Sales ownership enforcement, bounded list queries, strict JSON input, optimistic concurrency, soft delete, and atomic mutation audit events.
- session-aware owner selection plus cloud CRUD, search, filter, pagination, loading/error/empty states, and version-conflict recovery;
- a Tools Hub launcher to `https://crm.samson.web.id/` while retaining the local CRM as a migration fallback;
- dashboard KPI and an ordered active follow-up workspace calculated by the shared deterministic CRM core;
- Admin-only JSON backup, safe CSV export, and two-phase JSON import with explicit owner mapping;
- server-side schema/option/date/score/ID/count validation, SHA-256 validation checksum, and idempotent commit;
- append and atomic replace modes with a single D1 batch, import job record, and non-sensitive audit event;
- a separate mocked browser E2E suite for CRM desktop/mobile behavior, four themes, XSS-safe rendering, Access expiry, import, export, and horizontal-overflow checks.

No online D1 database, Access policy, user email, secret, production route, or CRM data is created by committing these files. The all-zero database ID in the base Wrangler configuration is a local-only placeholder. Preview and production D1 bindings remain intentionally absent until their manual gates are approved. A custom domain becomes active only after an explicitly approved Cloudflare deployment.

## D1 schema controls

| Table | Primary controls | Requirement trace |
|---|---|---|
| `app_users` | case-insensitive unique email, `admin`/`sales` role, active flag | FUN-003–005 |
| `leads` | canonical options, Lost reason, scores 0–5, ownership FKs, optimistic `version`, soft-delete timestamp | FUN-006–013, DAT-004–005 |
| `import_jobs` | valid mode/status, 0–2,000 rows, SHA-256 checksum, one committed job per checksum | FUN-014–019, NFR-002 |
| `audit_logs` | actor, allowlisted action/entity, request ID, bounded JSON metadata | FUN-023, SEC-011 |

Migration `0001_initial.sql` has no seed statements. Dates receive format checks in D1; semantic date validation remains mandatory in the Worker validation layer before a statement is executed.

## Implemented API contract

Base path: `/api/crm/v1`

| Endpoint | Access | Current behavior |
|---|---|---|
| `GET /health` | Public | Returns non-sensitive component configuration state |
| `GET /session` | Active app user | Returns the mapped application user and role |
| `GET /users` | Active app user | Admin receives active assignable users; Sales receives only self; email is not exposed |
| `GET /leads` | Admin or Sales | Search, pipeline/owner filter, and bounded `limit`/`offset` pagination |
| `POST /leads` | Admin or Sales | Validates and creates a lead with an atomic audit event |
| `GET /leads/:id` | Admin or owning Sales | Returns one active lead; cross-owner access resolves as not found |
| `PUT /leads/:id` | Admin or owning Sales | Full replacement using mandatory `version`; stale updates return 409 |
| `DELETE /leads/:id` | Admin or owning Sales | Soft delete using mandatory `If-Match` version |
| `GET /dashboard` | Admin or Sales | Returns role-scoped KPI and active follow-up ordered by nearest schedule |
| `POST /imports/validate` | Admin | Validates backup and owner mapping without changing data; returns counts and SHA-256 checksum |
| `POST /imports/commit` | Admin | Revalidates and commits append/replace atomically; requires checksum, confirmation, and request ID |
| `GET /exports/backup.json` | Admin | Creates a versioned JSON backup from all active database rows |
| `GET /exports/leads.csv` | Admin | Creates a BOM-prefixed CSV with spreadsheet-formula neutralization |

All non-health endpoints require a valid RS256 Cloudflare Access assertion, configured issuer/audience, and an active matching row in `app_users`. Mutations require `X-Request-ID`. Dynamic SQL values use bound parameters; list results are limited to 100 rows per request. Admin may request `includeDeleted=1`; Sales queries always receive a server-side ownership predicate.

Audit-list access, restore UI, and an online rate-limiter binding are not exposed in Step 8. Cloudflare Access policy, online user provisioning, and every online database/domain action remain blocked by the manual infrastructure gates.

### Step 6 verification trace

| Requirement | Implemented control | Verification |
|---|---|---|
| FUN-002–004, API-001 | JWT signature/issuer/audience/time validation plus active user lookup | valid, missing, expired, tampered, wrong-audience, inactive-user tests |
| FUN-005, API-002, AC-002–003 | Role-aware ownership predicates on list/read/update/delete | Admin, Sales A, Sales B, and cross-owner tests |
| FUN-006–009 | CRUD, canonical options, Lost reason, and 0–5 scores | API integration plus deterministic core tests |
| FUN-012, AC-010 | `version` predicate and 409 response | stale update/delete tests |
| FUN-013, DAT-004 | soft-delete timestamp; no API hard-delete operation | delete and include-deleted tests; UI confirmation remains pending |
| FUN-023, SEC-003, SEC-011 | bound statements and atomic create/update/delete audit rows | injection and audit-count tests |
| API-003–006 | request ID, stable errors, same-origin routes, bounded list | API contract integration tests |

### Step 7 verification trace

| Requirement | Implemented control | Verification |
|---|---|---|
| FUN-001, FUN-024 | Tools Hub cloud launcher; explicit loading, empty, success, error, and retry states | registry/core tests and cloud UI static checks |
| FUN-003–005 | authenticated session identity, role label, minimal owner directory, Sales self-scope | Admin/Sales API integration tests |
| FUN-006–009, AC-004–006 | lead form, canonical pipeline, Lost reason, 0–5 score preview, search/filter, CRUD | cloud client contract tests plus server integration tests |
| FUN-012–013, AC-010 | version sent on update/delete, conflict recovery, explicit delete confirmation | cloud UI source checks and client contract tests |
| SEC-003, NFR-004 | dynamic rows use DOM text nodes; no CRM data in browser storage; mobile card reflow | no-`innerHTML`/storage assertions and responsive CSS checks |

The Step 7 interface only calls same-origin `/api/crm/v1/*` routes. It does not create Cloudflare resources, provision users, import local CRM records, or write production data.

### Step 8 verification trace

| Requirement | Implemented control | Verification |
|---|---|---|
| FUN-010–011, AC-011 | shared scoring/KPI rules; Won/Lost excluded from forecast and active follow-up | role-scoped API calculations and browser KPI/follow-up checks |
| FUN-014–017, NFR-005 | 5 MB/2,000 limits; schema, canonical option, date, score, ID, owner, file/target duplicate validation | invalid pipeline, duplicate-file, duplicate-target, oversized-file, and permission tests |
| FUN-018–019, NFR-002, SEC-009 | Admin-only validate/commit, explicit confirmation, checksum match, idempotent retry, one D1 batch | authorization, missing-confirmation, changed-checksum, retry, and forced mid-transaction rollback tests |
| FUN-020, FUN-022, NFR-003 | versioned server backup independent of table filters; local CRM key is never deleted | backup round-trip test and client source assertion |
| FUN-021 | every CSV cell is quoted and formula-leading values are prefixed safely | byte-order-mark and formula-injection regression tests |
| FUN-023, SEC-011 | import job plus audit actor/action/entity/request/timestamp and bounded metadata | audit counts and sensitive-content exclusion tests |
| FUN-024–025, NFR-004, AC-013 | explicit UI states, four themes, DOM-only dynamic content, responsive layout | static source checks plus dedicated desktop/mobile Playwright suite |

Step 8 still uses only synthetic `TEST-`/`E2E-` records in automated verification. It creates no Cloudflare resource and does not touch production data.

## Planned boundaries

| Concern | Location |
|---|---|
| Public Tools entry | existing Tools Hub |
| CRM UI | `apps/masumi-crm/` |
| Deterministic business rules | shared CRM core |
| API/auth/data access | `worker/masumi-crm/` |
| Database migrations | `migrations/masumi-crm/` |
| Cloud deployment config | `wrangler.crm.jsonc` |

## Commands

```text
npm run build:masumi-crm-cloud
npm run db:migrate:masumi-crm:local
npm run test:masumi-crm-cloud
npm run test:masumi-crm-d1
npm run test:masumi-crm-api
npm run test:masumi-crm-ui
npm run test:e2e:masumi-crm
npm run verify:masumi-crm-worker
```

`verify:masumi-crm-worker` is a dry run. It does not deploy or create Cloudflare resources.

## Preview deployment without interactive Cloudflare login

Use `.github/workflows/masumi-crm-preview.yml` when an interactive Cloudflare login is
blocked by a repeated browser verification challenge. The workflow is deliberately
inactive until PR #54 receives the `deploy-masumi-preview` label. A later manual
`workflow_dispatch` run is also supported after the workflow exists on the default branch.

One-time manual setup in a normal local browser:

1. Create a Cloudflare API token restricted to the target account with only
   `Workers Scripts: Edit` and `D1: Edit` account permissions.
2. In the GitHub repository, create an Actions environment named
   `masumi-crm-preview`. Add `CLOUDFLARE_API_TOKEN` and
   `CLOUDFLARE_ACCOUNT_ID` as environment secrets. Configure a required reviewer
   when the repository plan supports environment protection.
3. Add the `deploy-masumi-preview` label to PR #54 and approve the environment
   deployment if GitHub requests it.

Never paste the API token into chat, a PR, an issue, a commit, or a workflow input.
After the gate is approved, the workflow automatically validates the token, runs the
CRM test suite, creates or reuses the isolated `masumi-crm-preview` D1 database,
generates an ephemeral Wrangler binding, applies migrations, deploys
`samson-masumi-crm-preview`, and checks its health response. The generated config is
ignored by Git and the workflow never targets the production database or custom domain.

Cloudflare Access, real application users, and the production hostname remain separate
manual gates. Until Access is configured, the preview database is empty and protected
API operations remain unusable because Access issuer/audience settings and application
users are absent.

## Manual gates

1. Approve creation of preview D1/Worker resources.
2. Supply approved user email addresses outside source control.
3. Approve Cloudflare Access policy.
4. Approve custom-domain activation.
5. Complete UAT with synthetic data.
6. Approve production resources and production import.

## Rollback

The foundation is isolated from the current SAMSON Worker and local CRM. Reverting this branch removes the cloud scaffold without deleting `samsonMasumiCrmV1` data from user devices.
