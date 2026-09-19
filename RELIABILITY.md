# Reliability Measurement

The repository produces a rolling operational report without deploying, rolling back, or changing production data. Run it manually with the `Reliability Metrics` workflow or use the scheduled report every Sunday at 19:00 WIB.

## Canonical CI topology

| Layer | Purpose | Required check |
|---|---|---|
| `Validate` | Data contracts, lint, typecheck, unit coverage, deterministic regressions, build, headers, and Worker dry-runs | `validate` |
| `Browser E2E` | Browser behavior for SAMSON and MASUMI CRM | `browser-e2e` |
| `SAMSON Preview Verification` | Isolated preview deployment and revision/route contracts | `preview-verification` |
| Cloudflare Workers Builds | Native Worker preview/build result | `Workers Builds: prompt-v5` |
| `Production Verify` | Post-merge production revision, HTTP, security, catalog, and B2B health checks | Post-deployment evidence |

The former `CI & Edge Verification` workflow was removed because it repeated lint, typecheck, unit tests, regression suites, build, security checks, and Worker dry-runs already owned by `Validate`. Browser E2E now validates only the built header artifact; Worker dry-runs remain in `Validate`.

## Metrics

The default rolling window is 30 days.

| Metric | Formula | Source |
|---|---|---|
| CI reliability | Successful terminal runs / terminal runs | Pull-request runs from Validate, Browser E2E, and SAMSON Preview Verification |
| CI first-pass reliability | Successful attempt-1 runs / terminal runs | Same canonical PR workflows |
| Deployment success rate | Successful Production Verify runs / terminal Production Verify runs | Main-branch push runs after the native Cloudflare build |
| Recovery time | First failed Production Verify completion to the next successful completion | Consecutive failures are one incident |

`cancelled`, `skipped`, and `neutral` outcomes are excluded from denominators because concurrency cancellation and conditional jobs do not represent a product failure. Failure, timed-out, stale, startup-failure, and action-required outcomes count as failures.

The report includes mean, median, and P90 recovery time. If the window has no recovered incident, recovery time is reported as `N/A`; the workflow never invents a zero-minute MTTR.

## Evidence and limitations

- JSON and Markdown reports are retained as workflow artifacts for 30 days.
- The workflow summary shows the current rolling values and per-workflow reliability.
- An unrecovered incident remains visible until a later successful Production Verify run appears in the selected window.
- The metric is repository-level operational evidence, not a substitute for business SLA monitoring or external uptime monitoring.
- Thresholds are not enforcement gates yet. Establish targets only after a stable baseline is observed.
