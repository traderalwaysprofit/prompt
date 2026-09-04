# SAMSON Operations Runbook — September 2026

This runbook turns the observability and visual engines into repeatable operator workflows without granting them publish/deploy/external-mutation authority.

## 1. Observability operational flow

### Source of truth

Reviewed non-secret targets:

```text
config/observability-targets.production.json
```

Current reviewed targets:

- `SAMSON B2B API Health` — `https://samson.web.id/api/tools/b2b/health`
- `SPM VPS Dashboard` — `https://dashboard.sumberpelitamataram.com`

Do not add a redirector/AppURL target until its provider-specific health endpoint and fallback destination are verified.

### Validate config locally

```bash
npm run observability:validate
```

To produce the minified JSON value suitable for the Cloudflare environment variable:

```bash
npm run observability:print-env
```

This command only prints the reviewed target array. It does not modify Cloudflare.

### Read-only smoke test

```bash
npm run observability:smoke
```

The smoke checker:

- performs GET requests only;
- uses `redirect: manual`;
- treats HTTP 2xx/3xx as reachable;
- fails on 4xx/5xx, timeout, DNS, or network failure;
- does not send alerts;
- does not mutate routes.

GitHub also exposes the manual workflow:

```text
Actions → Observability Smoke
```

Use this before production activation or after changing monitored targets.

### Production activation checklist

Activation is an external runtime change and is intentionally not performed by repository CI.

Required operator-reviewed Cloudflare settings:

```text
OBSERVABILITY_ENABLED=true
OBSERVABILITY_TIMEOUT_MS=4000
OBSERVABILITY_TARGETS_JSON=<output from reviewed config>
ALERT_WEBHOOK_URL=<Cloudflare secret>
```

Before activation:

1. `npm run observability:validate` passes;
2. manual `Observability Smoke` passes for all targets;
3. alert webhook destination is verified;
4. alert receiver is confirmed to be operational;
5. target owners understand the 5-minute probe cadence;
6. incident noise/cooldown risk is accepted or durable deduplication is added first.

### Current self-healing boundary

The engine may classify fallback readiness, but it must **not** silently mutate AppURL, Shopee, DNS, ads, or another production system.

External failover requires a separate authorized executor with:

- provider allowlist;
- idempotency key;
- audit log;
- rollback path;
- explicit mutation policy.

## 2. Visual artifact operational flow

### Reviewed input

Visuals are generated from version-controlled JSON payloads, for example:

```text
examples/visuals/forex-rule-card.json
```

### Generate locally

```bash
npm run visual:generate -- \
  --input examples/visuals/forex-rule-card.json \
  --name forex-rule-card \
  --outdir dist-visuals
```

Output:

```text
dist-visuals/forex-rule-card.svg
dist-visuals/forex-rule-card.png
```

### Generate through GitHub Actions

Use:

```text
Actions → Visual Artifact Generator
```

Inputs:

- reviewed JSON payload path;
- output filename.

The workflow:

1. installs locked dependencies;
2. runs visual generator/render tests;
3. generates SVG + PNG;
4. verifies both files exist;
5. uploads the pair as a GitHub Actions artifact for 14 days.

The workflow **does not publish or schedule social media content**.

### Approval boundary

Recommended production visual lifecycle:

```text
Content brief
   ↓
Reviewed JSON visual payload
   ↓
Headless render
   ↓
SVG + PNG artifact
   ↓
Human visual QA
   ↓
Approved asset
   ↓
Separate publish/scheduling instruction
```

Publishing remains a separate explicit action.

## 3. Repository maintenance cadence

### Weekly

- review open PRs and failed checks;
- review Dependabot PRs;
- check branch count;
- run observability smoke if production targets changed;
- verify visual workflow still produces an artifact.

### Monthly

- branch ancestry audit;
- documentation drift check: README + PRD + runbooks;
- review Cloudflare bindings/vars/secrets inventory without exposing values;
- review observability incident noise and target relevance;
- review dependency update backlog.

## 4. Definition of operational readiness

A capability is considered operational only when:

- code exists in `main`;
- automated tests pass;
- runbook exists;
- operator can trigger/verify it without editing source code;
- secret/config boundary is documented;
- failure mode is visible;
- external side effects remain approval-gated.
