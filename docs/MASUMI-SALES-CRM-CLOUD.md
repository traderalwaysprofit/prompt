# MASUMI Sales CRM Cloud

Status: **Local D1 schema / Draft PR**

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

## Current foundation

This branch introduces only reversible repository foundations:

- a separate static application source in `apps/masumi-crm/`;
- a separate Worker entrypoint in `worker/masumi-crm/`;
- a separate build output in `dist-crm/`;
- `wrangler.crm.jsonc` with preview/production environment boundaries;
- a public, non-sensitive health endpoint at `/api/crm/v1/health`;
- a deliberately inactive response for all data endpoints;
- a four-theme foundation screen with no sample prospect data;
- security headers specific to the CRM hostname.
- an executable D1 migration for `app_users`, `leads`, `import_jobs`, and `audit_logs`;
- database constraints for canonical pipeline stages, Lost reason, score ranges, ownership references, the 2,000-active-lead limit, and committed-import idempotency;
- network-free SQLite integration tests that execute the D1-compatible migration in CI.

No online D1 database, Access policy, user email, secret, production route, or CRM data is created by committing these files. The all-zero database ID in the base Wrangler configuration is a local-only placeholder. Preview and production D1 bindings remain intentionally absent until their manual gates are approved. A custom domain becomes active only after an explicitly approved Cloudflare deployment.

## D1 schema controls

| Table | Primary controls | Requirement trace |
|---|---|---|
| `app_users` | case-insensitive unique email, `admin`/`sales` role, active flag | FUN-003–005 |
| `leads` | canonical options, Lost reason, scores 0–5, ownership FKs, optimistic `version`, soft-delete timestamp | FUN-006–013, DAT-004–005 |
| `import_jobs` | valid mode/status, 0–2,000 rows, SHA-256 checksum, one committed job per checksum | FUN-014–019, NFR-002 |
| `audit_logs` | actor, allowlisted action/entity, request ID, bounded JSON metadata | FUN-023, SEC-011 |

Migration `0001_initial.sql` has no seed statements. Dates receive format checks in D1; semantic date validation remains mandatory in the Worker validation layer before a statement is executed.

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
npm run verify:masumi-crm-worker
```

`verify:masumi-crm-worker` is a dry run. It does not deploy or create Cloudflare resources.

## Manual gates

1. Approve creation of preview D1/Worker resources.
2. Supply approved user email addresses outside source control.
3. Approve Cloudflare Access policy.
4. Approve custom-domain activation.
5. Complete UAT with synthetic data.
6. Approve production resources and production import.

## Rollback

The foundation is isolated from the current SAMSON Worker and local CRM. Reverting this branch removes the cloud scaffold without deleting `samsonMasumiCrmV1` data from user devices.
