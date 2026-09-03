# SAMSON Observability Engine V1

## Runtime model

The production Worker keeps its existing `prompt-v5` identity and `worker/index.js` entrypoint. A Cloudflare Cron Trigger invokes the observability engine every five minutes.

The engine is deliberately **disabled by default**. A merge therefore does not start probing third-party endpoints until runtime configuration has been reviewed.

## Required runtime configuration

Non-secret variables:

- `OBSERVABILITY_ENABLED=true`
- `OBSERVABILITY_TIMEOUT_MS=4000`
- `OBSERVABILITY_TARGETS_JSON=<JSON array>`

Example target configuration:

```json
[
  {
    "name": "SPM VPS Dashboard",
    "url": "https://dashboard.sumberpelitamataram.com",
    "type": "VPS_DASHBOARD"
  },
  {
    "name": "Marketing Redirector",
    "url": "https://REPLACE-WITH-VERIFIED-REDIRECTOR-HEALTH-ENDPOINT.example/health",
    "fallbackUrl": "https://REPLACE-WITH-VERIFIED-MARKETPLACE-DESTINATION.example/",
    "type": "REDIRECTOR"
  }
]
```

Do not activate the redirector entry until the provider-specific health endpoint and marketplace fallback have been verified manually.

Secret configuration:

- `ALERT_WEBHOOK_URL` — set through Cloudflare Secrets/Dashboard, never committed to Git.

The webhook must be public HTTPS. Loopback, private, link-local, metadata, credential-bearing, and non-HTTPS targets are rejected.

## Health policy

- HTTP `2xx` and `3xx` are considered reachable/healthy.
- HTTP `4xx`/`5xx`, timeout, DNS failure, and network failure create an incident.
- Redirect following is disabled during probes to reduce redirect-based SSRF risk.
- Signed query parameters may be used for a probe, but query/hash data is stripped from telemetry and alerts.
- A configured fallback is probed only after the primary fails.

## Self-healing boundary

V1 performs **fallback verification**, not external route mutation.

When the primary is down and the fallback is healthy, the incident is marked `FALLBACK_READY`. The alert explicitly says that a route change still requires an authorized executor. This prevents the monitoring loop from silently changing AppURL, Shopee, DNS, advertising, or other external state.

A future failover executor should require an allowlisted provider adapter, idempotency key, audit log, rollback path, and explicit policy for which mutations may run without human approval.

## Alerting caveat

V1 does not provision a durable incident store or KV-based cooldown. A persistent outage can therefore generate one alert per scheduled run. Before enabling high-volume monitoring, add incident deduplication/cooldown through a durable Cloudflare binding (for example KV or Durable Objects).
