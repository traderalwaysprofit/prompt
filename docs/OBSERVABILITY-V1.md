# SAMSON Observability Engine V1

## Runtime model

The production Worker keeps its existing `prompt-v5` identity and `worker/index.js` entrypoint. A Cloudflare Cron Trigger invokes the observability engine every five minutes.

The engine remains deliberately **disabled by default**. A merge therefore does not start probing third-party endpoints until runtime configuration has been reviewed and activated by an operator.

## Reviewed production target source

Non-secret target configuration is version-controlled at:

```text
config/observability-targets.production.json
```

Current reviewed targets:

- `SAMSON B2B API Health` — `https://samson.web.id/api/tools/b2b/health`
- `SPM VPS Dashboard` — `https://dashboard.sumberpelitamataram.com`

A redirector/AppURL target is intentionally absent until its real health endpoint and fallback destination are verified.

## Deterministic config validation

```bash
npm run observability:validate
```

The validator rejects malformed config, duplicate targets, non-HTTPS URLs, credentials, fragments, localhost/private/link-local/metadata targets, unsupported types, and identical primary/fallback URLs.

To print the reviewed target array as minified JSON for operator use:

```bash
npm run observability:print-env
```

This command does not modify Cloudflare.

## Read-only smoke test

Local:

```bash
npm run observability:smoke
```

GitHub Actions:

```text
Actions → Observability Smoke
```

The smoke workflow performs read-only GET probes with `redirect: manual`. It does not enable production observability, send incident alerts, or mutate routes.

## Required production runtime configuration

Non-secret Cloudflare variables:

- `OBSERVABILITY_ENABLED=true`
- `OBSERVABILITY_TIMEOUT_MS=4000`
- `OBSERVABILITY_TARGETS_JSON=<validated reviewed target array>`

Secret configuration:

- `ALERT_WEBHOOK_URL` — set through Cloudflare Secrets/Dashboard, never committed to Git.

Production activation is an external runtime change and is not performed automatically by repository CI.

## Health policy

- HTTP `2xx` and `3xx` are considered reachable/healthy.
- HTTP `4xx`/`5xx`, timeout, DNS failure, and network failure create an incident.
- Redirect following is disabled during probes to reduce redirect-based SSRF risk.
- Signed query parameters may be used for a probe, but query/hash data is stripped from telemetry and alerts.
- A configured fallback is probed only after the primary fails.

## Self-healing boundary

V1 performs **fallback verification**, not external route mutation.

When the primary is down and the fallback is healthy, the incident is marked `FALLBACK_READY`. The alert states that route mutation still requires an authorized executor. This prevents the monitoring loop from silently changing AppURL, Shopee, DNS, advertising, or other external state.

A future failover executor must require:

- allowlisted provider adapter;
- idempotency key;
- audit log;
- rollback path;
- explicit policy for which mutations may run without human approval.

## Alerting caveat

V1 does not provision a durable incident store or KV-based cooldown. A persistent outage can therefore generate one alert per scheduled run. Before enabling high-volume monitoring, add incident deduplication/cooldown through a durable Cloudflare binding such as KV or Durable Objects.

See also `docs/OPERATIONS-RUNBOOK.md` for the activation checklist and operational cadence.
